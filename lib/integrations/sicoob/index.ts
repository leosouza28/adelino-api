import axios from 'axios';
import https from 'https';
import fs from 'fs';
import dayjs from 'dayjs';
import { response } from 'express';
import { logDev } from '../../util';
import { v4 } from 'uuid';
import { IntegracoesModel } from '../../models/integracoes.model';
import path from 'path';

export class SicoobIntegration {

    development: boolean = false;
    client_id: string = "";
    auth_url: string = "";
    url: string = "";
    httpsAgent: any;
    bearer_token: string = "";
    authorized: boolean = false;
    scopes: string = "";
    chave_pix = '42156259000176';
    integracao: any = null;

    constructor() {
        this.development = false;
    }


    async init(integracao_id: string) {
        try {
            let integracao: any = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.integracao = integracao
            this.chave_pix = integracao.chave_pix || '';
            this.client_id = integracao.client_id!;
            this.auth_url = 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token';
            this.url = 'https://api.sicoob.com.br';
            this.scopes = integracao.scopes!;
            let certPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'cert.crt');
            let keyPath = path.join(__dirname, 'certificates', integracao.path_certificado!, 'key.key');

            this.httpsAgent = new https.Agent({
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath),
                rejectUnauthorized: false
            })
            let need_auth = true;
            if (integracao?.bearer_token && integracao?.last_bearer_token_update) {
                // Dura apenas 5 minutos
                let tokenAge = (Date.now() - integracao.last_bearer_token_update.getTime()) / 1000;
                if (tokenAge < 300) {
                    this.bearer_token = integracao.bearer_token;
                    this.authorized = true;
                } else {
                    need_auth = true;
                }
            }
            if (need_auth) {
                let bearer_token = await this.authenticate();
                this.bearer_token = bearer_token;
                this.authorized = true;
                await IntegracoesModel.findByIdAndUpdate(integracao_id, {
                    bearer_token: bearer_token,
                    last_bearer_token_update: dayjs().toDate()
                });
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
            form.append('scope', this.scopes);
            let response = await axios({
                method: "POST",
                url: `${this.auth_url}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: this.httpsAgent,
                data: form.toString()
            })
            this.bearer_token = `Bearer ${response.data.access_token}`;
            this.authorized = true;
            return `Bearer ${response.data.access_token}`;
        } catch (error) {
            throw error;
        }
    }

    async getRecebimentos(dataInicial: string, dataFinal: string) {
        try {
            let query = new URLSearchParams({
                inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString()
            }).toString();
            let paginaAtual = 0;
            let totalPaginas = 1;
            let todosResultados: any[] = [];
            while (paginaAtual < totalPaginas) {
                query = new URLSearchParams({
                    inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                    fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString(),
                    'paginacao.paginaAtual': paginaAtual.toString()
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.url}/pix/api/v2/pix?${query}`,
                    httpsAgent: this.httpsAgent,
                    headers: {
                        'client_id': this.client_id,
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
                console.log("Erro ao consultar Pix recebidos:", error.response.data);
            }
            throw error;
        }
    }

    async gerarPix(data: any) {
        try {
            let txid = v4().split('-').join('');
            let response = await axios({
                method: "PUT",
                url: `${this.url}/pix/api/v2/cob/${txid}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'client_id': this.client_id,
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ ...data, chave: this.chave_pix })
            })
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async consultaPix(txid: string) {
        try {
            let response = await axios({
                method: "GET",
                url: `${this.url}/pix/api/v2/cob/${txid}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'client_id': this.client_id,
                    'authorization': this.bearer_token
                }
            })
            return response.data;
        } catch (error) {
            throw error;
        }
    }
    async devolverPix(e2eid: String, valor: number) {
        try {
            let txid = v4().split('-').join('');
            let response = await axios({
                method: "PUT",
                url: `${this.url}/pix/api/v2/pix/${e2eid}/devolucao/${txid}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'client_id': this.client_id,
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    valor: valor.toFixed(2)
                })
            })
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getWebhooks() {
        try {
            let response = await axios({
                method: "GET",
                url: `${this.url}/pix/api/v2/webhook`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'client_id': this.client_id,
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
            })
            logDev("Webhooks", response.data);
        } catch (error) {
            throw error;
        }
    }

    async setWebhook(url: string = 'https://webhook.trackpix.com.br/webhook/sicoob') {
        try {
            // try {
            //     let response = await axios({
            //         method: "PATCH",
            //         url: `${this.url}/api/v2/webhook/${this.chave_pix}`,
            //         httpsAgent: this.httpsAgent,
            //         headers: {
            //             'client_id': this.client_id,
            //             'authorization': this.bearer_token,
            //         },
            //     })
            //     logDev("Webhook deletado", response.status);
            // } catch (error) {
            //     console.log(error);
            //     logDev("Nenhum webhook para deletar");
            // }
            let response = await axios({
                method: "PUT",
                url: `${this.url}/pix/api/v2/webhook/${this.chave_pix}`,
                httpsAgent: this.httpsAgent,
                headers: {
                    'client_id': this.client_id,
                    'authorization': this.bearer_token,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    webhookUrl: url
                })
            })
            await IntegracoesModel.findByIdAndUpdate(this.integracao._id, {
                webhook_configurado: true,
                webhook_url: url
            });
            logDev("Webhook configurado", response.status);
            logDev("Webhook configurado para:", url);
        } catch (error) {
            throw error;
        }
    }

}