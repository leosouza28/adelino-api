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

export class ItauIntegration {

    development: boolean = true;
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
        this.development = false;
    }

    async init(integracao_id: string) {
        try {
            let integracao = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.chave_pix = integracao.chave_pix || '';
            this.client_id = integracao.client_id!;
            this.client_secret = integracao.client_secret!;
            this.auth_url = 'https://sts.itau.com.br/api';
            this.url = 'https://secure.api.itau/pix_recebimentos/v2';
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
            form.append('client_secret', this.client_secret);
            let response = await axios({
                method: "POST",
                url: this.auth_url + '/oauth/token',
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
                    url: `${this.url}/pix?${query}`,
                    headers: {
                        'Authorization': this.bearer_token,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: this.httpsAgent
                })
                let dados = response.data;
                todosResultados = todosResultados.concat(dados.pix);
                totalPaginas = dados.parametros.paginacao.quantidadeDePaginas;
                paginaAtual += 1;
            }
            console.log("Retornando resultados:", todosResultados.length);
            return todosResultados;
        } catch (error) {
            throw error;
        }
    }
}