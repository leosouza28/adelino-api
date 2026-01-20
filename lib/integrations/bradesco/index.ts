import axios from "axios";
import { IntegracoesModel } from "../../models/integracoes.model";
import https from 'https';
import path from 'path';
import fs from 'fs'
import dayjs from "dayjs";
import { logDev } from "../../util";


interface IIntegracao {
    _id?: string;
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
            let integracao: any = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.chave_pix = integracao.chave_pix || '';
            this.integracao = integracao;
            this.client_id = integracao.client_id!;
            this.client_secret = integracao.client_secret!;
            this.auth_url = 'https://qrpix.bradesco.com.br/auth/server/oauth/token'
            this.url = 'https://qrpix.bradesco.com.br';
            let certPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'cert.pem');
            let keyPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'key.pem');
            this.httpsAgent = new https.Agent({
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath),
                rejectUnauthorized: false
            })
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
            let agora = dayjs().format('YYYY-MM-DD');
            let _dataFinal = '';
            if (agora === dayjs(dataFinal).format('YYYY-MM-DD')) {
                _dataFinal = dayjs().toISOString();
            } else {
                _dataFinal = dayjs(dataFinal).endOf('day').toISOString();
            }
            let _dataInicial = dayjs(dataInicial).toISOString()
            while (paginaAtual < totalPaginas) {
                let query = new URLSearchParams({
                    inicio: _dataInicial,
                    fim: _dataFinal,
                    'paginacao.paginaAtual': paginaAtual.toString(),
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.url}/v2/pix?${query}`,
                    httpsAgent: this.httpsAgent,
                    headers: {
                        'Accept': 'application/json',
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

    async setWebhook(url: string = 'https://webhook.trackpix.com.br/webhook') {
        try {
            let response = await axios({
                method: "PUT",
                url: `${this.url}/v2/webhook/${this.chave_pix}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'authorization': this.bearer_token
                },
                data: JSON.stringify({
                    webhookUrl: url
                })
            })
            await IntegracoesModel.updateOne(
                {
                    _id: this.integracao._id
                },
                {
                    $set: {
                        webhook_configurado: true,
                        webhook_url: url
                    }
                }
            )
            console.log(`Webhook definido com sucesso: ${response.status}`);
        } catch (error: any) {
            if (error.response.data) {
                console.log("Erro ao consultar Pix recebidos:", JSON.stringify(error.response.data, null, 2));
            }
            throw error
        }
    }
    async getWebhooks() {
        try {
            let response = await axios({
                method: "GET",
                url: `${this.url}/v2/webhook`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'Accept': 'application/json',
                    'authorization': this.bearer_token
                }
            })
            console.log(JSON.stringify(response.data, null, 2));
        } catch (error: any) {
            if (error.response.data) {
                console.log("Erro ao consultar Pix recebidos:", JSON.stringify(error.response.data, null, 2));
            }
            throw error
        }
    }
}