import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { errorHandler, logDev } from '../../util';
import dayjs from 'dayjs';
import { v4 } from 'uuid';

const {
    BB_DEV_DEVELOPER_APPLICATION_KEY,
    BB_DEV_BASIC_TOKEN,
    BB_PROD_DEVELOPER_APPLICATION_KEY,
    BB_PROD_BASIC_TOKEN
} = process.env
// const isDev = process.env.DEV === '1' ? true : false
const isDev = false;

const SERVER_AUTH = isDev ? 'https://oauth.hm.bb.com.br' : 'https://oauth.bb.com.br';
const SERVER_PIX = isDev ? 'https://api-pix.hm.bb.com.br/pix/v2' : 'https://api-pix.bb.com.br/pix/v2';

const CHAVE_PIX = isDev ? '95127446000198' : '+5591980783686';

const RECEBEDOR = {
    instituicao: "BANCO DO BRASIL",
    razao_social: "RESTAURANTE AMOR E PAIXAO",
    // razao_social: "MARIA C M ALVES LTDA",
    cnpj: "57.743.794/0001-09",
}

let pathCerts = path.join(__dirname + '/../../certs', isDev ? 'developer-bb/dev' : 'developer-bb/prod');

const httpsAgent = isDev ? new https.Agent({
    rejectUnauthorized: false,
    cert: fs.readFileSync(pathCerts + '/client.crt'),
    key: fs.readFileSync(pathCerts + '/client.key'),
    ca: fs.readFileSync(pathCerts + '/ca.crt')
}) : new https.Agent({
    rejectUnauthorized: false,
    cert: fs.readFileSync(pathCerts + '/client.crt'),
    key: fs.readFileSync(pathCerts + '/client.key'),
    ca: fs.readFileSync(pathCerts + '/chain-client.crt')
})

export async function oAuthBB() {
    try {
        let response = await axios({
            method: "POST",
            url: `${SERVER_AUTH}/oauth/token`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `${isDev ? BB_DEV_BASIC_TOKEN : BB_PROD_BASIC_TOKEN}`
            },
            data: {
                'grant_type': 'client_credentials',
                'scope': 'cob.write cob.read pix.write pix.read webhook.read webhook.write'
            },
        })
        return {
            bearer_token: `${response.data.token_type} ${response.data.access_token}`,
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
            token_type: response.data.token_type
        }
    } catch (error: any) {
        throw new Error(`Error getting OAuth token: ${error}`);
    }
}

interface IPayloadPix {
    expiracaoSegundos: number
    pagador: IPayloadPagadorPix
    valor: number
    solicitacaoPagador: string
}
interface IPayloadPagadorPix {
    nome: string
    cpf: string
}
interface ICobPixResponse {
    calendario: ICobPixCalendario
    devedor: ICobPixDevedor
    valor: ICobPixValor
    pix: any[]
    chave: string
    txid: string
    revisao: number
    solicitacaoPagador: string
    location: string
    status: string | 'ATIVA' | 'CONCLUIDA';
    pixCopiaECola: string;
}
interface ICobPixValor {
    original: string
    modalidadeAlteracao: number
}
interface ICobPixDevedor {
    cpf?: string
    cnpj?: string
    nome: string
}
interface ICobPixCalendario {
    criacao: string
    expiracao: number
}

export async function consultaCobPix(txid: string, bearerToken: string | undefined): Promise<ICobPixResponse> {
    try {
        if (!bearerToken) {
            let auth = await oAuthBB();
            bearerToken = auth.bearer_token;
        }
        let q = new URLSearchParams();
        if (isDev) q.append('gw-dev-app-key', BB_DEV_DEVELOPER_APPLICATION_KEY);
        if (!isDev) q.append('gw-dev-app-key', BB_PROD_DEVELOPER_APPLICATION_KEY);

        let url = new URL(SERVER_PIX + '/cob/' + txid);
        url.search = q.toString();

        let _url = url.toString();
        let response = await axios({
            method: "GET",
            url: _url,
            httpsAgent,
            headers: getHeaders(bearerToken)
        })
        response.data.calendario.criado_em = dayjs(response.data.calendario.criacao).toDate();
        response.data.calendario.expira_em = dayjs(response.data.calendario.criacao).add(response.data.calendario.expiracao, 'seconds').toDate();
        response.data.recebedor = RECEBEDOR;
        logDev(response.data)
        return response.data
    } catch (error) {
        throw error;
    }
}

export async function generateCobPix(payload: IPayloadPix | undefined, bearerToken: string | undefined): Promise<ICobPixResponse> {
    try {
        if (!bearerToken) {
            let auth = await oAuthBB();
            bearerToken = auth.bearer_token;
        }
        let q = new URLSearchParams();
        if (isDev) q.append('gw-dev-app-key', BB_DEV_DEVELOPER_APPLICATION_KEY);
        if (!isDev) q.append('gw-dev-app-key', BB_PROD_DEVELOPER_APPLICATION_KEY);

        if (payload === undefined) {
            payload = {
                expiracaoSegundos: 300,
                pagador: {
                    nome: 'Leonardo Souza',
                    cpf: '02581748206'
                },
                valor: 1,
                solicitacaoPagador: 'Solicitação do Pagador'
            }
        }
        let url = new URL(SERVER_PIX + '/cob');
        url.search = q.toString();
        let _url = url.toString();
        let response = await axios({
            method: "POST",
            url: _url,
            httpsAgent,
            headers: getHeaders(bearerToken),
            data: JSON.stringify({
                calendario: {
                    expiracao: payload?.expiracaoSegundos || 300,
                },
                devedor: {
                    cpf: payload?.pagador?.cpf,
                    nome: payload?.pagador?.nome
                },
                valor: {
                    original: (payload?.valor || 0)?.toFixed(2),
                },
                chave: CHAVE_PIX,
                solicitacaoPagador: payload?.solicitacaoPagador,
                infoAdicionais: []
            })
        })
        response.data.calendario.criado_em = dayjs(response.data.calendario.criacao).toDate();
        response.data.calendario.expira_em = dayjs(response.data.calendario.criacao).add(response.data.calendario.expiracao, 'seconds').toDate();
        response.data.recebedor = RECEBEDOR;
        logDev(response.data);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Falha ao gerar o PIX")
    }
}

export async function devolucaoCobPix(id: string = v4(), e2eId: string, valor: number, bearerToken: string | undefined): Promise<any> {
    try {
        id = id.replace(/-/g, '');
        if (!bearerToken) {
            let auth = await oAuthBB();
            bearerToken = auth.bearer_token;
        }
        let q = new URLSearchParams();
        if (isDev) q.append('gw-dev-app-key', BB_DEV_DEVELOPER_APPLICATION_KEY);
        if (!isDev) q.append('gw-dev-app-key', BB_PROD_DEVELOPER_APPLICATION_KEY);

        let url = new URL(SERVER_PIX + `/pix/${e2eId}/devolucao/${id}`);
        url.search = q.toString();
        let _url = url.toString();
        let response = await axios({
            method: "PUT",
            url: _url,
            httpsAgent,
            headers: getHeaders(bearerToken),
            data: JSON.stringify({
                valor: valor.toFixed(2)
            })
        })
        logDev(response.data);
        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Falha ao gerar o PIX")
    }
}

function getHeaders(bearerToken: string) {
    let headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    if (!!bearerToken) headers['Authorization'] = bearerToken;
    return headers;
}