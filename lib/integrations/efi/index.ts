import axios from "axios";
import { IntegracoesModel } from "../../models/integracoes.model";
import https from 'https';
import path from 'path';
import fs from 'fs'
import dayjs from "dayjs";
import { logDev } from "../../util";
import { ObjectId } from "mongoose";

interface IIntegracao {
    _id?: ObjectId;
    client_id?: string;
    client_secret?: string;
    path_certificado?: string;
    bearer_token_dev?: string;
    last_bearer_token_update_dev?: Date;
    bearer_token?: string;
    last_bearer_token_update?: Date;
    chave_pix?: string
}

export class EfiIntegration {

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
            this.integracao = integracao;
            this.chave_pix = integracao.chave_pix || '';
            this.client_id = integracao.client_id!;
            this.client_secret = integracao.client_secret!;

            this.url = 'https://pix.api.efipay.com.br';
            let pfxPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'cert.p12');
            this.httpsAgent = new https.Agent({
                pfx: fs.readFileSync(pfxPath),
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
            let basicAuth = `Basic ` + Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');
            let response = await axios({
                method: "POST",
                url: this.url + '/oauth/token',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': basicAuth
                },
                httpsAgent: this.httpsAgent,
                data: JSON.stringify({
                    'grant_type': 'client_credentials'
                })
            })
            return `${response.data.token_type} ${response.data.access_token}`;
        } catch (error) {
            console.log(error);
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
                    inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                    fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString(),
                    'paginacao.paginaAtual': paginaAtual.toString(),
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.url}/v2/pix?${query}`,
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

    async getWebhooks() {
        try {
            let response = await axios({
                method: "GET",
                url: `${this.url}/v2/webhook?inicio=2020-10-22T16:01:35Z&fim=2026-01-16T21:01:35Z`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                }
            })
            logDev(response.data);
            return response.data;
        } catch (error) {
            throw error;
        }

    }
    async checkWebhook() {
        try {
            let response = await axios({
                method: "GET",
                url: `${this.url}/v2/webhook/${this.chave_pix}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                }
            })
            logDev(response.data);
            return response.data;
        } catch (error) {
            throw error;
        }

    }
    async reenviarWebhook() {
        try {
            let response = await axios({
                method: "POST",
                url: `${this.url}/v2/gn/webhook/reenviar`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    "tipo": "PIX_RECEBIDO",
                    "e2eids": [
                        "E60746948202601161335A2144xqNmrE"
                    ]
                })
            })
            logDev("Reenviados", response.data);
        } catch (error) {
            throw error;
        }
    }
    async setWebhook(url: string = 'https://webhook.trackpix.com.br/webhook') {
        try {
            // tentar difinir que vai receber o webhook de qualquer lugar
            try {
                let _url = `${this.url}/v2/gn/config`
                let body = {
                    "pix": {
                        "receberSemChave": true,
                        "chaves": {
                            [this.chave_pix]: {
                                "recebimento": {
                                    "txidObrigatorio": false,
                                    "qrCodeEstatico": {
                                        "recusarTodos": false
                                    },
                                    "webhook": {
                                        "notificacao": {
                                            "tarifa": true,
                                            "pagador": true
                                        },
                                        "notificar": {
                                            "pixSemTxid": true
                                        }
                                    }
                                },
                            }
                        }
                    }
                }
                let resp_config = await axios({
                    method: "PUT",
                    url: _url,
                    httpsAgent: this.httpsAgent,
                    headers: {
                        'authorization': this.bearer_token,
                        "Content-Type": "application/json"
                    },
                    data: JSON.stringify(body)
                })
                console.log(`Configuração da Chave PIX OK`, resp_config.status);
            } catch (error: any) {
                console.log("Erro ao obter config", error.response.data);
            }

            let response = await axios({
                method: "PUT",
                url: `${this.url}/v2/webhook/${this.chave_pix}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    webhookUrl: url
                })
            })
            console.log("Webhook configurado:", response.status);
            // await IntegracoesModel.updateOne(
            //     {
            //         _id: this.integracao._id,
            //     },
            //     {
            //         $set: {
            //             webhook_configurado: true,
            //             webhook_url: url
            //         }
            //     }
            // )
        } catch (error) {
            throw error;
        }
    }
    async deleteWebhook(chave = '') {
        try {
            if (!chave) chave = this.chave_pix;
            await axios({
                method: "DELETE",
                url: `${this.url}/v2/webhook/${chave}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                }
            })
            logDev("Excluida", chave)
        } catch (error) {
            throw error;
        }
    }
}