import axios from "axios";
import { IntegracoesModel } from "../../models/integracoes.model";
import https from 'https';
import path from 'path';
import fs from 'fs'
import dayjs from "dayjs";
import { logDev } from "../../util";


interface IIntegracao {
    client_id?: string;
    client_secret?: string;
    path_certificado?: string;
    bearer_token_dev?: string;
    last_bearer_token_update_dev?: Date;
    bearer_token?: string;
    last_bearer_token_update?: Date;
    chave_pix?: string
}

export class BradescoIntegration {

    development: boolean = false;
    client_id: string = '';
    client_secret: string = '';
    auth_url: string = '';
    url: string = '';
    httpsAgent: any;
    bearer_token: string = ''
    authorized: boolean = false;
    integracao: IIntegracao = {};
    chave_pix: string = '';

    constructor() {
    }

    async init(integracao_id: string) {
        try {
            let integracao = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.chave_pix = integracao.chave_pix || '';
            this.client_id = integracao.client_id!;
            this.client_secret = integracao.client_secret!;
            if (this.development) {
                this.auth_url = 'https://openapisandbox.prebanco.com.br/auth/server/oauth/token';
                this.url = 'https://openapisandbox.prebanco.com.br:443/v2/pix';
                let certPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'cert.pem');
                let keyPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'key.pem');
                this.httpsAgent = new https.Agent({
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath),
                    rejectUnauthorized: false
                })
            } else {
                this.auth_url = 'https://qrpix.bradesco.com.br/auth/server/oauth/token'
                this.url = 'https://qrpix.bradesco.com.br/v2/pix';
                let certPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'cert.pem');
                let keyPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'key.pem');
                this.httpsAgent = new https.Agent({
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath),
                    rejectUnauthorized: false
                })
            }
            if (this.development) {
                let need_auth = true
                if (integracao?.bearer_token_dev && integracao?.last_bearer_token_update_dev) {
                    // Dura apenas 1 hora
                    let tokenAge = (Date.now() - integracao.last_bearer_token_update_dev.getTime()) / 1000;
                    if (tokenAge < 3600) {
                        this.bearer_token = integracao.bearer_token_dev;
                        this.authorized = true;
                        need_auth = false;
                    } else {
                        need_auth = true;
                    }
                }
                if (need_auth) {
                    this.bearer_token = await this.authenticate();
                    integracao.bearer_token_dev = this.bearer_token;
                    integracao.last_bearer_token_update_dev = new Date();
                    await integracao.save();
                    this.authorized = true;
                }
            } else {
                let need_auth = true
                if (integracao?.bearer_token && integracao?.last_bearer_token_update) {
                    // Dura apenas 1 hora
                    let tokenAge = (Date.now() - integracao.last_bearer_token_update.getTime()) / 1000;
                    if (tokenAge < 3600) {
                        this.bearer_token = integracao.bearer_token;
                        this.authorized = true;
                        need_auth = false;
                    } else {
                        need_auth = true;
                    }
                }
                if (need_auth) {
                    this.bearer_token = await this.authenticate();
                    integracao.bearer_token = this.bearer_token;
                    integracao.last_bearer_token_update = new Date();
                    await integracao.save();
                    this.authorized = true;
                }
            }
            return { success: 1, initializated: true }
        } catch (error: any) {
            return { success: 0, error: error?.message || "Erro desconhecido" }
        }
    }
    async authenticate() {
        try {
            let form = new URLSearchParams();
            form.append('grant_type', 'client_credentials');
            form.append('client_id', this.client_id);
            form.append('client_secret', this.client_secret);
            let response = await axios({
                method: "POST",
                url: this.auth_url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: this.httpsAgent,
                data: form.toString()
            })
            return `${response.data.token_type} ${response.data.access_token}`;
        } catch (error) {
            throw error;
        }
    }

    async getRecebimentos(dataInicial: string, dataFinal: string) {
        try {
            let paginaAtual = 0;
            let totalPaginas = 1;
            let todosResultados: any[] = [];
            while (paginaAtual < totalPaginas) {
                let query = new URLSearchParams({
                    inicio: dayjs(dataInicial).startOf('day').add(3, 'h').format("YYYY-MM-DDTHH:mm:ss"),
                    fim: dayjs(dataFinal).endOf('day').add(3, 'h').format("YYYY-MM-DDTHH:mm:ss"),
                    // 'paginacao.paginaAtual': paginaAtual.toString(),
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.url}?${query}`,
                    httpsAgent: this.httpsAgent,
                    headers: {
                        'authorization': this.bearer_token
                    }
                })
                let dados = response.data;
                todosResultados = todosResultados.concat(dados.pix);
                totalPaginas = dados.parametros.paginacao.quantidadeDePaginas;
                paginaAtual += 1;
            }
            return todosResultados;
        } catch (error: any) {
            if (error.response.data) {
                console.log("Erro ao consultar Pix recebidos:", JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
}