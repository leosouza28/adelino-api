import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { MunicipiosModel } from "../models/municipios.model";
import { errorHandler, logDev, MoneyBRL } from "../util";

import dayjs from "dayjs";
import fileUpload from "express-fileupload";
import { storage } from "../integrations/firebase";
import { USUARIO_NIVEL, UsuariosModel } from "../models/usuarios.model";
import { isScopeAuthorized } from "../oauth/permissions";
import { RecebimentosPixModel } from "../models/recebimentos-pix.model";
import { EmpresasModel } from "../models/empresas.model";
import { PerfisModel } from "../models/perfis.model";
import { LojasModel } from "../models/lojas.model";
import { AcessosModel } from "../models/acesso.model";
import { InteresseModel } from "../models/interesse.model";
import { POSModel } from "../models/pos.model";

export default {
    admin: {
        getDashboardAdmin: async (req: Request, res: Response, next: NextFunction) => {
            try {
                let response = {};
                res.json(response);
            } catch (error) {
                errorHandler(error, res);
            }
        },
        uploadImage: async (req: Request, res: Response, next: NextFunction) => {
            try {
                let url = '';
                if (Object.keys(req?.files || {}).length) {
                    for (let item in req.files) {
                        let file;
                        if (!Array.isArray(req.files[item])) {
                            file = req.files[item] as fileUpload.UploadedFile;
                            let fileName = file.name;
                            let storageFile = storage.file(`imgs/${fileName}`);
                            let counter = 1;

                            while ((await storageFile.exists())[0]) {
                                const extensionIndex = fileName.lastIndexOf('.');
                                const baseName = extensionIndex !== -1 ? fileName.substring(0, extensionIndex) : fileName;
                                const extension = extensionIndex !== -1 ? fileName.substring(extensionIndex) : '';
                                fileName = `${baseName}(${counter})${extension}`;
                                storageFile = storage.file(`imgs/${fileName}`);
                                counter++;
                            }
                            await storageFile.save(file.data, { metadata: { 'contentType': file.mimetype } });
                            await storageFile.makePublic();
                            url = storageFile.publicUrl();
                        }
                    }
                }
                if (req.body?.set_photo && !!req.usuario?._id) {
                    await UsuariosModel.findOneAndUpdate(
                        { _id: req.usuario?._id },
                        {
                            $set: {
                                'foto_url': url
                            }
                        }
                    )
                    logDev('Foto alterada com sucesso!');
                }
                let decoded_url = decodeURIComponent(url);
                res.json({ url: decoded_url })
            } catch (error) {
                errorHandler(error, res);
            }
        },

    },
    getConsultaCEP: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { cep } = req.query;
            if (!cep) throw new Error("CEP não informado");
            let response;
            try {
                let resp = await axios({
                    method: 'get',
                    url: `https://viacep.com.br/ws/${cep}/json/`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                if (!!resp?.data?.logradouro) response = resp.data;
            } catch (error) {
                logDev(error);
                throw new Error(`Erro ao consultar o CEP`);
            }
            if (!response) throw new Error(`Não foi possível consultar o CEP`);
            res.json(response);
        } catch (error) {
            errorHandler(error, res)
        }
    },
    submitInteresse: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.body.cnpj === '30727693000180') {
                throw new Error("Porque o meu mesmo? Que isso... Encontrou o easter egg heim :)");
            }
            // Verifica se teve algum interesse para o cnpj informado
            let interesse = await InteresseModel.findOne({ cnpj: req.body.cnpj });
            if (interesse) {
                res.json({ message: 'Já estamos com seu formulário, em breve nosso time comercial entrará em contato com você.' });
            } else {
                let novoInteresse = new InteresseModel({
                    nome_empresa: req.body.nome_empresa,
                    cnpj: req.body.cnpj,
                    nome_proprietario: req.body.nome_proprietario,
                    telefone: req.body.telefone,
                    cidade: req.body.cidade,
                    cupom_indicacao: req.body.cupom_indicacao,
                    connection_data: req.connection_data
                });
                await novoInteresse.save();
                res.json({ message: 'Seu interesse foi registrado com sucesso! Em breve nosso time comercial entrará em contato com você.' });
            }
        } catch (error) {
            errorHandler(error, res);
        }
    },
    computaAcesso: async (req: Request, res: Response, next: NextFunction) => {
        try {
            logDev(req.query, req.connection_data);
            if (req.connection_data?.origin?.includes('localhost')) {
                logDev("Acesso de desenvolvimento não computado");
                return res.json({ message: 'Acesso de desenvolvimento não computado' });
            }
            let ip = req?.connection_data?.ip || '';
            if (!ip) {
                logDev("IP não identificado, acesso não computado");
                return res.json({ message: 'IP não identificado, acesso não computado' });
            }
            let doc = new AcessosModel({
                body_params: req.body,
                query_params: req.query,
                connection_data: req.connection_data
            });
            await doc.save();
            res.json({ message: 'OK' });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getDefaultValues: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let sexos = [
                { label: "Não informar", value: 'NAO_INFORMAR' },
                { label: "Masculino", value: 'MASCULINO' },
                { label: "Feminino", value: 'FEMININO' }
            ];
            let parentescos = [
                "PAI",
                "MÃE",
                "FILHO",
                "FILHA",
                "AVÔ",
                "AVÓ",
                "MARIDO",
                "ESPOSA",
                "NETO",
                "NETA",
                "IRMÃO",
                "IRMÃ",
                "SOGRO",
                "SOGRA",
                "GENRO",
                "NORA",
                "ENTEADO",
                "ENTEADA",
                "CUNHADO",
                "CUNHADA",
                "AVÔ DO CÔNJUGE",
                "AVÓ DO CÔNJUGE",
                "NETO DO CÔNJUGE",
                "NETA DO CÔNJUGE",
                "OUTRO",
            ].sort(
                (a: string, b: string) => {
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                }
            );


            let niveis_acesso = Object.keys(USUARIO_NIVEL).map((key: string) => {
                return {
                    // @ts-ignore
                    label: USUARIO_NIVEL[key],
                    value: key
                }
            })

            res.json({
                sexos,
                parentescos,
                niveis_acesso
            })
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getEstados: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let estados = await MunicipiosModel.aggregate([
                {
                    $group: {
                        _id: "$estado",
                        nome: { $first: "$estado.nome" },
                        sigla: { $first: "$estado.sigla" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        nome: 1,
                        sigla: 1
                    }
                },
                { $sort: { sigla: 1 } }
            ])
            res.json(estados);
        } catch (error) {
            errorHandler(error, res)
        }
    },
    getCidades: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let estado = req.query.estado;
            if (!estado) throw new Error("Estado não informado");
            let cidades = await MunicipiosModel.aggregate([
                {
                    $match: {
                        "estado.sigla": estado
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        nome: { $first: "$nome" },
                        estado: { $first: "$estado" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        nome: 1,
                        estado: 1
                    }
                },
                { $sort: { nome: 1 } }
            ])
            res.json(cidades);
        } catch (error) {
            errorHandler(error, res)
        }
    },
    verificarCodigoAtivacao: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { codigo_ativacao } = req.body;
            let empresa = await EmpresasModel.findOne({ codigo_ativacao: codigo_ativacao });
            if (!empresa) throw new Error('Código de ativação inválido');
            res.json(empresa);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getLojas: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;
            let filtros: any = {
                'empresa._id': String(req.empresa._id)
            };
            total = await LojasModel.countDocuments(filtros);
            lista = await LojasModel.find(filtros).sort({ nome: 1 }).skip(skip).limit(perpage);
            res.json({ lista, total });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getLojaById: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id } = req.params;
            let loja = await LojasModel.findOne({ _id: id, 'empresa._id': String(req.empresa._id) });
            if (!loja) throw new Error('Loja não encontrada');
            res.json(loja);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    setLoja: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { _id, nome } = req.body;
            if (nome.trim().length == 0) throw new Error('O nome da loja é obrigatório');
            if (!!_id) {
                let loja = await LojasModel.findOneAndUpdate(
                    { _id: _id, 'empresa._id': String(req.empresa._id) },
                    {
                        $set: {
                            nome,
                            tipo_comercio: req.body?.tipo_comercio || "",
                            atualizado_por: {
                                data_hora: dayjs().toDate(),
                                usuario: req.usuario
                            }
                        }
                    },
                    { new: true }
                );
                if (!loja) throw new Error('Loja não encontrada');
                res.json(loja);
            } else {
                let novaLoja = new LojasModel({
                    nome,
                    tipo_comercio: req.body?.tipo_comercio || "",
                    empresa: {
                        _id: String(req.empresa._id),
                        nome: req.empresa.nome
                    },
                    criado_por: {
                        data_hora: dayjs().toDate(),
                        usuario: req.usuario
                    }
                });
                await novaLoja.save();
                res.json(novaLoja);
            }
        } catch (error) {
            errorHandler(error, res);
        }
    },
    setPerfil: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { _id, nome, scopes } = req.body;
            if (scopes.length == 0) throw new Error('O perfil deve possuir ao menos uma permissão');
            if (nome.trim().length == 0) throw new Error('O nome do perfil é obrigatório');
            if (nome.trim().includes('ADM')) throw new Error('Nome do Perfil inválido');
            if (!!_id) {
                let perfil = await PerfisModel.findOneAndUpdate(
                    { _id: _id, 'empresa._id': String(req.empresa._id) },
                    {
                        $set: {
                            nome,
                            scopes,
                            atualizado_por: {
                                data_hora: dayjs().toDate(),
                                usuario: req.usuario
                            }
                        }
                    },
                    { new: true }
                );
                if (!perfil) throw new Error('Perfil não encontrado');
                res.json(perfil);
            } else {
                let novoPerfil = new PerfisModel({
                    nome,
                    scopes,
                    empresa: {
                        _id: String(req.empresa._id),
                        nome: req.empresa.nome
                    },
                    criado_por: {
                        data_hora: dayjs().toDate(),
                        usuario: req.usuario
                    }
                });
                await novoPerfil.save();
                res.json(novoPerfil);
            }
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getPerfilById: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id } = req.params;
            let perfil = await PerfisModel.findOne({ _id: id, 'empresa._id': String(req.empresa._id) });
            if (!perfil) throw new Error('Perfil não encontrado');
            res.json(perfil);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getPerfis: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;
            let filtros: any = {
                'empresa._id': String(req.empresa._id)
            };
            total = await PerfisModel.countDocuments(filtros);
            lista = await PerfisModel.find(filtros).sort({ nome: 1 }).skip(skip).limit(perpage);
            res.json({ lista, total });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getDashboardAdmin: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let response: any = {};

            if (isScopeAuthorized('pagina_inicial.dashboard_admin_geral', req.usuario?.scopes || [])) {
                // Montar dados do dashboard geral do admin

                let di = dayjs(req.query.data_inicial as string).startOf('day').add(3, 'hour').toDate();
                let df = dayjs(req.query.data_final as string).endOf('day').add(3, 'hour').toDate();

                let total_pixs_periodo = 0,
                    total_valor_pixs_periodo = 0,
                    ticket_medio_periodo = 0,
                    maior_transacao_periodo = 0,
                    menor_transacao_periodo = 0,
                    ranking_pagadores = [],
                    pagamentos_diario = [];

                let totais1 = await RecebimentosPixModel.aggregate([
                    {
                        $match: {
                            horario: {
                                $gte: di,
                                $lte: df
                            },
                            'empresa._id': String(req.empresa._id)
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total_pixs: { $sum: 1 },
                            total_valor_pixs: { $sum: "$valor" },
                            ticket_medio: { $avg: "$valor" },
                            maior_transacao: { $max: "$valor" },
                            menor_transacao: { $min: "$valor" }
                        }
                    }
                ])

                if (totais1.length > 0) {
                    total_pixs_periodo = totais1[0].total_pixs;
                    total_valor_pixs_periodo = totais1[0].total_valor_pixs;
                    ticket_medio_periodo = totais1[0].ticket_medio;
                    maior_transacao_periodo = totais1[0].maior_transacao;
                    menor_transacao_periodo = totais1[0].menor_transacao;
                }

                // Ranking dos maiores pagadores
                let ranking = await RecebimentosPixModel.aggregate([
                    {
                        $match: {
                            horario: {
                                $gte: di,
                                $lte: df
                            },
                            'empresa._id': String(req.empresa._id)
                        }
                    },
                    {
                        $group: {
                            // agrupado pode ser pagador.cpf ou pagador.cnpj
                            _id: {
                                $cond: [
                                    { $ifNull: ["$pagador.cpf", false] },
                                    "$pagador.cpf",
                                    "$pagador.cnpj"
                                ]
                            },
                            nomePagador: { $first: "$pagador.nome" },
                            total_valor: { $sum: "$valor" },
                            total_pixs: { $sum: 1 }
                        }
                    },
                    { $sort: { total_valor: -1 } },
                    { $limit: 10 }
                ]);

                ranking_pagadores = ranking.map(r => ({
                    nomePagador: r?.nomePagador || "Nome não capturado",
                    documento: r?._id || "Documento não capturado",
                    total_valor: r.total_valor,
                    total_pixs: r.total_pixs
                }));

                // Ranking diario de pagamentos, tem que levar em consideração a data -3 horas
                let pagamentos_dia = await RecebimentosPixModel.aggregate([
                    {
                        $match: {
                            horario: {
                                $gte: di,
                                $lte: df
                            },
                            'empresa._id': String(req.empresa._id)
                        }
                    },
                    {
                        $addFields: {
                            horario_ajustado: {
                                $dateSubtract: {
                                    startDate: "$horario",
                                    unit: "hour",
                                    amount: 3
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$horario_ajustado" }
                            },
                            total_valor: { $sum: "$valor" },
                            total_pixs: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

                pagamentos_diario = pagamentos_dia.map(p => ({
                    data: p._id,
                    total_valor: p.total_valor,
                    total_pixs: p.total_pixs
                }));

                response.dashboard_admin = {
                    total_pixs_periodo,
                    total_valor_pixs_periodo,
                    ticket_medio_periodo,
                    maior_transacao_periodo,
                    menor_transacao_periodo,
                    ranking_pagadores,
                    pagamentos_diario
                }

            }
            res.json(response);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getListaPOS: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { empresas, q } = req.query;
            let filter: any = { 'empresa._id': String(req.empresa._id) }

            let empresas_array = String(empresas).split(',');
            // Verifica se o usuário tem essas empresas no req.usuario.empresas (controle de acesso)
            if (req.usuario?.empresas && Array.isArray(req.usuario.empresas)) {
                let empresas_permitidas = req.usuario.empresas.map(e => String(e._id));
                filter['empresa._id'] = { $in: empresas_array.filter(e => empresas_permitidas.includes(e)) };
            }

            if (q && String(q).trim().length > 0) {
                filter['$or'] = [
                    { pos_identificacao: { $regex: String(q).trim(), $options: 'i' } },
                ]
            }

            let lista = await POSModel.find(filter).sort({ pos_identificacao: 1 });

            res.json({ lista, total: lista.length });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    setPOS: async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log("OK");
            throw new Error("Not implemented");
        } catch (error) {
            errorHandler(error, res);
        }
    },

}


