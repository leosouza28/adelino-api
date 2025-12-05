import bcrypt from 'bcrypt';
import dayjs from "dayjs";
import { NextFunction, Request, Response } from "express";
import { v4 } from 'uuid';
import { sendEmailConfirmacaoConta, sendEmailRecuperacaoAcesso } from '../integrations/email';
import compiler from '../integrations/handlebars/compiler';
import { USUARIO_MODEL_STATUS, USUARIO_MODEL_TIPO_TELEFONE, USUARIO_NIVEL, UsuariosModel } from "../models/usuarios.model";
import { gerarSessao, NAO_AUTORIZADO, UNAUTH_SCOPE } from "../oauth";
import { getAllAvailableScopes, isScopeAuthorized } from '../oauth/permissions';
import { errorHandler, isValidCPF, isValidTelefone, logDev, mascaraCPFouCNPJ, mascaraTelefone } from "../util";


const USER_ERRORS = {
    INVALID_DOCUMENT: 'Documento inválido',
    USER_NOT_FOUND: 'Usuário não encontrado',
    USER_BLOCKED: 'Usuário bloqueado',
    INCORRECT_PASSWORD: 'Senha incorreta',
    USER_WITHOUT_PASSWORD: 'Usuário não possui senha cadastrada'
}

export default {
    me: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req?.usuario?._id && !req?.logado) throw NAO_AUTORIZADO;

            let is_cpf_valid = false;
            try {
                isValidCPF(req.usuario?.documento);
                is_cpf_valid = true;
            } catch (error) { }
            if (req.usuario && is_cpf_valid) req.usuario.doc_type = 'cpf';
            else if (req.usuario && !is_cpf_valid) req.usuario.doc_type = 'passaporte';


            res.json(req.usuario);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    login: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { documento, senha, scope } = req.body;
            if (!documento || !senha) throw new Error('Documento e senha são obrigatórios.')
            let usuario = await UsuariosModel.findOne({
                $or: [
                    {
                        documento: documento
                    },
                    {
                        username: documento
                    }
                ]
            }).lean();
            if (!usuario) throw new Error(USER_ERRORS.USER_NOT_FOUND);
            if (!usuario.niveis.includes(scope)) throw new Error("Usuário não autorizado para este escopo.");
            if (!usuario?.senha) throw new Error(USER_ERRORS.USER_WITHOUT_PASSWORD);
            if (usuario.status != USUARIO_MODEL_STATUS.ATIVO) throw new Error(USER_ERRORS.USER_BLOCKED);
            // @ts-ignore
            if (process.env.DEV !== '1') if (!bcrypt.compareSync(senha, usuario.senha)) throw new Error(USER_ERRORS.INCORRECT_PASSWORD);

            let sessao = await gerarSessao(usuario._id);

            res.json(sessao);
        } catch (error: any) {
            if (error?.message == USER_ERRORS.USER_NOT_FOUND) {
            }
            errorHandler(error, res);
        }
    },
    getUsuario: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id, busca_por, tipo_documento, documento } = req.query;
            let usuario = null;
            if (!!busca_por) {
                if (busca_por == 'cliente' && !!documento) {
                    usuario = await UsuariosModel.findOne({ documento: documento, niveis: USUARIO_NIVEL.CLIENTE }).lean();
                } else {
                    throw new Error("Consulta não identificada");
                }
            } else {
                usuario = await UsuariosModel.findOne({ _id: id }).lean();
            }
            if (!usuario) throw new Error('Usuário não encontrado.');
            if (usuario?.senha) delete usuario.senha;
            if (!usuario?.doc_type) usuario.doc_type = 'cpf';
            res.json(usuario);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getPermissoes: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let permissoes = getAllAvailableScopes();
            res.json(permissoes);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getVendedores: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let vendedores = await UsuariosModel.find({
                niveis: USUARIO_NIVEL.VENDEDOR,
                status: USUARIO_MODEL_STATUS.ATIVO
            }).sort({ nome: 1 }).lean();

            if (!req.usuario?.scopes?.includes('*')) {
                if (req.usuario?.niveis?.includes(USUARIO_NIVEL.VENDEDOR) && !req.usuario?.niveis?.includes(USUARIO_NIVEL.SUPERVISOR_VENDAS)) {
                    // @ts-ignore
                    vendedores = vendedores.filter(v => v._id.toString() == req.usuario._id.toString());
                }
            }
            res.json({ lista: vendedores, total: vendedores.length });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getUsuarios: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { perpage, page, status, nivel_acesso, ...query } = req.query
            // @ts-ignore
            if (!isScopeAuthorized('usuarios.leitura', req.usuario?.scopes)) {
                throw UNAUTH_SCOPE
            }
            let busca = req.query?.q || "";
            let lista: any = [], total = 0,
                porpagina = 10, pagina = 0, skip = 0, limit = 0;

            if (perpage && page) {
                porpagina = Number(perpage);
                pagina = Number(page);
                pagina--
                skip = porpagina * pagina;
                limit = porpagina;
            }

            let find: any = {
                $or: [
                    { documento: { $regex: busca, $options: 'i' } },
                    { nome: { $regex: busca, $options: 'i' } },
                    { email: { $regex: busca, $options: 'i' } }
                ],
                username: { $ne: 'admin' }
            }

            if (status != 'TODOS') find['status'] = status
            if (nivel_acesso != 'TODOS') find['niveis'] = nivel_acesso

            total = await UsuariosModel.find(find).countDocuments();
            lista = await UsuariosModel.find(find)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();

            res.json({ lista, total })
        } catch (error) {
            errorHandler(error, res);
        }
    },
    addUsuarioSimples: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let doc, now = dayjs().toDate();
            let payload: any = {
                niveis: [USUARIO_NIVEL.CLIENTE],
                nome: req.body.nome,
                documento: req.body.documento,
                data_nascimento: null,
                telefone_principal: null,
                telefones: [],
                origem_cadastro: "ADMINISTRADOR",
                status: USUARIO_MODEL_STATUS.ATIVO,
                criado_por: {
                    data_hora: now,
                    // @ts-ignore
                    usuario: req.usuario
                }
            }
            if (!!req?.body?.data_nascimento) {
                payload.data_nascimento = dayjs(req.body.data_nascimento).toDate();
            }
            if (!!req.body?.telefone) {
                await isValidTelefone(req.body.telefone);
                payload.telefones.push({
                    principal: true,
                    tipo: USUARIO_MODEL_TIPO_TELEFONE.CELULAR,
                    valor: req.body.telefone
                })
                payload.telefone_principal = {
                    tipo: USUARIO_MODEL_TIPO_TELEFONE.CELULAR,
                    valor: req.body.telefone
                }
            }
            await validarUsuario(payload)
            doc = new UsuariosModel(payload);
            await doc.save();

            // @ts-ignore
            gerarLead(payload, req.usuario).catch(err => console.log("Errrrr"));

            res.json(doc);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    addUsuario: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let doc, now = dayjs().toDate();

            // @ts-ignore
            if (!isScopeAuthorized('usuarios.editar', req.usuario?.scopes)) {
                throw UNAUTH_SCOPE
            }

            let payload: any = {
                niveis: [],
                nome: req.body.nome,
                username: req.body.username,
                documento: req.body.documento,
                email: req.body?.email || null,
                data_nascimento: null,
                status: req.body.status,
                telefones: [],
                telefone_principal: null,
            }
            if (req.body?.nivel_cliente) payload.niveis.push(USUARIO_NIVEL.CLIENTE);
            if (req.body?.nivel_admin) payload.niveis.push(USUARIO_NIVEL.ADMIN);
            if (req.body?.nivel_vendedor) payload.niveis.push(USUARIO_NIVEL.VENDEDOR);
            if (req.body?.nivel_supervisor) payload.niveis.push(USUARIO_NIVEL.SUPERVISOR_VENDAS);
            if (!!req.body?.sexo) payload.sexo = req.body.sexo;
            if (req.body?.data_nascimento?.length == '10') payload.data_nascimento = dayjs(req.body.data_nascimento).toDate();
            if (!req.body?._id) payload.senha = bcrypt.hashSync(req.body.senha, 10);

            for (let tel of req.body.telefones) {
                let telefone = {
                    tipo: tel.tipo,
                    valor: tel.valor,
                    principal: tel?.principal || false
                }
                payload.telefones.push(telefone);
                if (tel?.principal) payload.telefone_principal = telefone;
            }
            if (!!req.body.endereco?.logradouro) {
                payload.endereco = {
                    cep: req.body?.endereco?.cep || "",
                    logradouro: req.body?.endereco?.logradouro || "",
                    numero: req.body?.endereco?.numero || "",
                    complemento: req.body?.endereco?.complemento || "",
                    bairro: req.body?.endereco?.bairro || "",
                    cidade: req.body?.endereco?.cidade || "",
                    estado: req.body?.endereco?.estado || ""
                }
            }

            await validarUsuario(payload);

            if (payload?.niveis?.includes(USUARIO_NIVEL.ADMIN)) {
                logDev("Definindo scopes")
                logDev(req.body.scopes);
                payload.scopes = req.body.scopes;
            } else {
                logDev("Redefinindo scopes")
                payload.scopes = []
            }

            if (!!req.body?._id) {
                payload.atualizado_por = {
                    data_hora: now,
                    // @ts-ignore
                    usuario: req.usuario
                }
                if (!!req.body?.senha) payload.senha = bcrypt.hashSync(req.body.senha, 10);
                await UsuariosModel.updateOne({ _id: req.body._id }, {
                    $set: { ...payload }
                })
            } else {
                payload.criado_por = {
                    data_hora: now,
                    // @ts-ignore
                    usuario: req.usuario
                }
                let has_user_doc = await UsuariosModel.findOne({ documento: req.body.documento }).lean();
                if (has_user_doc) throw new Error("Documento já cadastrado!");
                let has_username = await UsuariosModel.findOne({ username: req.body.username }).lean();
                if (has_username) throw new Error("Nome de usuário já cadastrado!");
                
                payload.origem_cadastro = 'ADM';
                doc = new UsuariosModel(payload).save()
                doc = (await doc).toJSON()
            }

            res.json(doc);
        } catch (error) {
            errorHandler(error, res);
        }
    },

}

async function validarUsuario(usuario: any) {
    try {
        if (!usuario?.documento) throw new Error("Documento é obrigatório!");
        if (!usuario?.username) throw new Error("Nome de usuário é obrigatório!");
        isValidCPF(usuario.documento)
        if (!usuario?.nome) throw new Error("Nome é obrigatório!");
        for (let tel of (usuario?.telefones || [])) {
            if (!tel?.valor) throw new Error("Número de telefone é obrigatório!");
            await isValidTelefone(tel.numero);
        }
    } catch (error) {
        throw error
    }
}

