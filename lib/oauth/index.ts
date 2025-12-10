import jwt from 'jwt-simple';
import dayjs from 'dayjs';
import { errorHandler } from '../util/index';
import { NextFunction, Request, Response } from 'express';
import { USUARIO_MODEL_STATUS, UsuariosModel } from '../models/usuarios.model';
import { IncomingHttpHeaders } from 'http';
import { getAllAvailableScopes } from './permissions';


const NAO_AUTORIZADO = new Error("Não autorizado");
const UNAUTH_SCOPE = new Error("Escopo não autorizado");

async function gerarSessao(id_usuario: any) {
    try {
        let usuario = await UsuariosModel.findOne({ _id: id_usuario }, { nome: 1, documento: 1, niveis: 1, scopes: 1 }).lean();
        if (!usuario) throw new Error("Usuário não encontrado");
        let payload: any = {
            _id: String(usuario._id),
            nome: usuario.nome,
            documento: usuario.documento,
            niveis: usuario.niveis,
            iat: dayjs().unix(),
            exp: dayjs().add(50, 'year').unix()
        }
        let token = jwt.encode(payload, process.env.JWT_SECRET!)
        payload.access_token = `Bearer ${token}`;
        // @ts-ignore
        payload._id = String(payload._id);
        payload.scopes = usuario.scopes;
        if (usuario?.scopes.includes('*')) {
            let allScopes = getAllAvailableScopes();
            payload.scopes = allScopes.map((scope) => scope.key);
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