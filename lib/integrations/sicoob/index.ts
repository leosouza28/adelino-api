import axios from 'axios';
import https from 'https';
import fs from 'fs';
import dayjs from 'dayjs';
import { response } from 'express';
import { logDev } from '../../util';
import { v4 } from 'uuid';
export class SicoobIntegration {

    client_id: string;
    server_url: string = "https://api.sicoob.com.br";
    auth_url: string = "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token";
    httpsAgent: any;
    bearer_token: string = "";
    authorized: boolean = false;
    scopes = "pix.write payloadlocation.write pix.read webhook.write cob.write lotecobv.write cob.read webhook.read cobv.read cobv.write lotecobv.read payloadlocation.read";
    chave_pix = '42156259000176';

    constructor() {
        const pathCerts = __dirname + '/cert-adelino';
        this.client_id = "bfb2bb61-ab1c-42ed-ae16-140d079810f9";
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            cert: fs.readFileSync(pathCerts + '/client.crt'),
            key: fs.readFileSync(pathCerts + '/client.key'),
            ca: fs.readFileSync(pathCerts + '/chain-client.crt')
        })

    }

    async authorize() {
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

    async consultaPixRecebidos(dataInicial: string, dataFinal: string) {
        try {
            let query = new URLSearchParams({
                inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString()
            }).toString();
            let paginaAtual = 0;
            let totalPaginas = 1;
            let todosResultados: any[] = [];
            while (paginaAtual < totalPaginas) {
                logDev("Buscando página", paginaAtual);
                query = new URLSearchParams({
                    inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                    fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString(),
                    'paginacao.paginaAtual': paginaAtual.toString()
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.server_url}/pix/api/v2/pix?${query}`,
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
            // console.error("Erro ao consultar Pix recebidos:", error);
        }
    }

    async gerarPix(data: any) {
        try {
            let txid = v4().split('-').join('');
            let response = await axios({
                method: "PUT",
                url: `${this.server_url}/pix/api/v2/cob/${txid}`,
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
                url: `${this.server_url}/pix/api/v2/cob/${txid}`,
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
                url: `${this.server_url}/pix/api/v2/pix/${e2eid}/devolucao/${txid}`,
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

    async setWebhook(url: string = 'https://adelino-api.lsdevelopers.dev/webhook/sicoob/pix') {
        try {
            let response = await axios({
                method: "PUT",
                url: `${this.server_url}/pix/api/v2/webhook/${this.chave_pix}`,
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
            console.log(response.status, response.data);
        } catch (error) {
            throw error;
        }
    }

}