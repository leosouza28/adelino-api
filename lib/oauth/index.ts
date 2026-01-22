import jwt from 'jwt-simple';
import dayjs from 'dayjs';
import { errorHandler } from '../util/index';
import { NextFunction, Request, Response } from 'express';
import { USUARIO_MODEL_STATUS, UsuariosModel } from '../models/usuarios.model';
import { IncomingHttpHeaders } from 'http';
import { getAllAvailableScopes } from './permissions';
import { PerfisModel } from '../models/perfis.model';
import { EmpresasModel } from '../models/empresas.model';


const NAO_AUTORIZADO = new Error("Não autorizado");
const UNAUTH_SCOPE = new Error("Escopo não autorizado");

async function gerarSessao(id_usuario: any) {
    try {
        let usuario = await UsuariosModel.findOne({ _id: id_usuario }, { nome: 1, documento: 1, niveis: 1, scopes: 1, empresas: 1 }).lean();
        if (!usuario) throw new Error("Usuário não encontrado");
        let payload: any = {
            _id: String(usuario._id),
            nome: usuario.nome,
            documento: usuario.documento,
            niveis: usuario.niveis,
            empresas: usuario.empresas,
            iat: dayjs().unix(),
            exp: dayjs().add(50, 'year').unix()
        }
        let token = jwt.encode(payload, process.env.JWT_SECRET!)
        payload.access_token = `Bearer ${token}`;
        // @ts-ignore
        payload._id = String(payload._id);
        // @ts-ignore

        let ids_perfis = usuario.empresas.map((e: any) => e.perfil._id);
        let perfis = await PerfisModel.find({ _id: { $in: ids_perfis } }).lean();
        for (let empresa of usuario.empresas || []) {
            // @ts-ignore
            let perfil = perfis.find(p => String(p._id) == String(empresa.perfil._id));
            if (perfil) {
                // @ts-ignore
                empresa.perfil = perfil;
                if (perfil?.scopes.includes('*')) {
                    // @ts-ignore
                    empresa.perfil.scopes = getAllAvailableScopes().map(s => s.key);
                } else {
                    // @ts-ignore
                    empresa.perfil.scopes = perfil?.scopes || [];
                }
            }
        }
        return payload;
    } catch (error) {
        throw error;
    }
}

async function autenticar(req: any, res: Response, next: NextFunction) {
    try {
        req.location = undefined;
        req.location_time = undefined;
        req.logado = undefined;
        req.usuario = undefined;
        req.empresa = undefined;

        if (req.headers?.['location']) {
            let [latitude, longitude] = req.headers?.['location']?.split(",");
            req.location = { latitude, longitude };
            if (req.headers['location-time']) {
                req.location_time = dayjs(getHeaderString(req.headers, 'location-time')).toDate();
            }
        }
        if (!req?.location && req.headers?.['x-appengine-citylatlong']) {
            let [latitude, longitude] = (getHeaderString(req.headers, 'x-appengine-citylatlong') || '')?.split(",");
            req.location = { latitude, longitude };
            req.location_time = dayjs().toDate()
        }

        if (req.headers['authorization']) {
            let [key, value] = req.headers['authorization'].split(" ");
            if (key != 'Bearer') throw NAO_AUTORIZADO;
            let decoded = jwt.decode(value, process.env.JWT_SECRET!);
            if (!decoded) throw NAO_AUTORIZADO
            req.usuario = await UsuariosModel.findOne({ _id: decoded._id }, { senha: 0, createdAt: 0, updatedAt: 0 }).lean();
            if (req.usuario?.status == USUARIO_MODEL_STATUS.BLOQUEADO) throw NAO_AUTORIZADO;
            req.logado = true;
            try {
                await UsuariosModel.updateOne({ _id: req.usuario._id }, {
                    $set: {
                        ultimo_acesso: dayjs().toDate(),
                        ultimo_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                        ultimo_user_agent: req.headers['user-agent'],
                    }
                });
            } catch (error) { }
        }
        if (req.headers['empresa'] && req.usuario) {
            let empresa = await EmpresasModel.findOne({ _id: req.headers['empresa'] }).lean();
            if (empresa) {
                // Verificar se o usuário tem acesso a essa empresa
                let possuiAcesso = false;
                for (let emp of req.usuario.empresas || []) {
                    if (String(emp._id) == String(empresa._id)) {
                        possuiAcesso = true;
                        break;
                    }
                }
                if (!possuiAcesso) throw NAO_AUTORIZADO;
                req.empresa = req.usuario.empresas.find((e: any) => String(e._id) == String(empresa._id));
                // Testar se o está ativo o usuário
                if (!req.empresa?.ativo) throw NAO_AUTORIZADO;
                let { scopes } = await PerfisModel.findOne({ _id: req.empresa.perfil._id }, { scopes: 1 }).lean() || { scopes: [] };
                req.usuario.scopes = scopes;
            }
        }
        next()
    } catch (error) {
        errorHandler(error, res);
    }
}

function is_authorized(idpermissao: Number, permissoes = []) {
    let authorized = false;
    if (permissoes.findIndex(item => item == idpermissao) > -1) authorized = true;
    return authorized;
}

function getHeaderString(headers: IncomingHttpHeaders, key: string): string | undefined {
    const value = headers[key];
    return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
}

function decodeToken(token: string) {
    try {
        let decoded = jwt.decode(token, process.env.JWT_SECRET!);
        if (!decoded) throw NAO_AUTORIZADO
        return decoded;
    } catch (error) {
        throw error;
    }
}


export {
    decodeToken,
    gerarSessao,
    autenticar,
    is_authorized,
    NAO_AUTORIZADO,
    UNAUTH_SCOPE
}