import axios from "axios";
import { IntegracoesModel } from "../../models/integracoes.model";
import https from 'https';
import path from 'path';
import fs from 'fs'
import dayjs from "dayjs";
import { logDev } from "../../util";
import { RecebimentosPixModel } from "../../models/recebimentos-pix.model";


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
    integracao: any = {};
    chave_pix: string = '';
    chave_pix2: string = '';
    chaves_itau: string[] = [];

    constructor() {
        this.development = false;
    }

    async init(integracao_id: string) {
        try {
            let integracao = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.integracao = integracao;
            this.chave_pix = integracao.chave_pix || '';
            this.chave_pix2 = integracao.chave_pix2 || '';
            this.chaves_itau = integracao.chaves_itau || [];
            // remover repetido de chaves_itau
            this.chaves_itau = Array.from(new Set(this.chaves_itau));
            this.client_id = integracao.client_id!;
            this.client_secret = integracao.client_secret!;
            this.auth_url = 'https://sts.itau.com.br/api';
            this.url = 'https://secure.api.itau';
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
    async getRecebimentos(dataInicial: string, dataFinal: string, processarPixesFunction?: Function) {
        try {
            let paginaAtual = 0;
            let totalPaginas = 1;
            let todosResultados: any[] = [];
            while (paginaAtual < totalPaginas) {
                let query = new URLSearchParams({
                    inicio: dayjs(dataInicial).startOf('day').add(3, 'h').toISOString(),
                    fim: dayjs(dataFinal).endOf('day').add(3, 'h').toISOString(),
                    'paginacao.paginaAtual': paginaAtual.toString()
                }).toString();
                let response = await axios({
                    method: "GET",
                    url: `${this.url}/pix_recebimentos/v2/pix?${query}`,
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
            try {
                if (processarPixesFunction) await processarPixesFunction(todosResultados, this.integracao);
            } catch (error) { }
            this.getRecebimentosConciliado(dataInicial);
            return todosResultados;
        } catch (error: any) {
            if (error?.response?.data) {
                logDev("Erro na resposta da API Itau:", JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async getRecebimentosConciliado(data: string = '') {
        try {
            let chaves: any = this.chaves_itau;
            logDev("Iniciando conciliação de recebimentos para as chaves:", chaves);
            // Criar promises para cada chave
            const chavePromises = chaves.map(async (chave: string) => {
                // logDev(`Conciliando recebimentos para a chave ${chave} na data ${data}`);
                let paginaAtual = 1;
                let totalPaginas = 1;
                let resultadosChave: any[] = [];
                
                while (paginaAtual <= totalPaginas) {
                    let query = new URLSearchParams({
                        data_lancamento: `${dayjs(data).format("YYYY-MM-DDTHH:mm")},${dayjs(data).endOf('day').add(3, 'h').format("YYYY-MM-DDTHH:mm")}`,
                        chaves: chave,
                        view: 'basico',
                        page: paginaAtual.toString(),
                        page_size: '100',
                    }).toString();
                    
                    let response = await axios({
                        method: "GET",
                        url: `${this.url}/pix_recebimentos_conciliacoes/v2/lancamentos_pix?${query}`,
                        headers: {
                            'Authorization': this.bearer_token,
                            'Content-Type': 'application/json',
                        },
                        httpsAgent: this.httpsAgent
                    });
                    
                    let dados = response.data;
                    resultadosChave = resultadosChave.concat(dados.data);
                    totalPaginas = dados.pagination.totalPages;
                    paginaAtual += 1;
                }
                
                return resultadosChave;
            });
            
            // Executar todas as promises em paralelo
            const resultadosPorChave = await Promise.all(chavePromises);
            const todosResultados = resultadosPorChave.flat();
            
            let updates = [];
            for (let lancamento of todosResultados) {
                if (
                    lancamento?.detalhe_pagamento?.id_pagamento &&
                    lancamento?.detalhe_pagamento?.debitado?.nome &&
                    lancamento?.detalhe_pagamento?.debitado?.numero_documento
                ) {
                    let payload_pagador: any = { nome: lancamento.detalhe_pagamento.debitado.nome };
                    if (lancamento?.detalhe_pagamento?.debitado?.numero_documento?.length == 11) {
                        payload_pagador['cpf'] = lancamento.detalhe_pagamento.debitado.numero_documento;
                    } else {
                        payload_pagador['cnpj'] = lancamento.detalhe_pagamento.debitado.numero_documento;
                    }
                    updates.push({
                        updateOne: {
                            filter: {
                                'endToEndId': lancamento.detalhe_pagamento.id_pagamento,
                                'empresa._id': this.integracao.empresa._id,
                            },
                            update: {
                                'nomePagador': lancamento.detalhe_pagamento.debitado.nome,
                                'pagador': payload_pagador
                            }
                        }
                    })
                }
            }
            
            if (updates.length > 0) {
                await RecebimentosPixModel.bulkWrite(updates, { ordered: false });
            }
            // logDev("Atualizados dados de pagadores em recebimentos conciliados:", updates.length);
            return todosResultados;
        } catch (error) {
            // @ts-ignore
            console.log(JSON.stringify(error?.response?.data, null, 2));
            throw error;
        }
    }
    async setWebhook(url_webhook: string = 'https://webhook.trackpix.com.br/webhook') {
        try {
            let chaves = [];
            if (this.chave_pix) chaves.push(this.chave_pix);
            if (this.chave_pix2) chaves.push(this.chave_pix2);
            for (let chave of chaves) {
                let _data = await axios({
                    method: "PUT",
                    url: `${this.url}/pix_recebimentos/v2/webhook/${chave}`,
                    headers: {
                        'Authorization': this.bearer_token,
                        'Content-Type': 'application/json',
                    },
                    httpsAgent: this.httpsAgent,
                    data: JSON.stringify({
                        webhookUrl: url_webhook,
                    })
                })
            }
        } catch (error: any) {
            if (error?.response?.data) {
                console.log(JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
    async getWebhooks() {
        try {
            let urlParams = new URLSearchParams();
            urlParams.append('inicio', '2024-01-01T00:00:00Z');
            urlParams.append('fim', dayjs().endOf('day').toISOString());
            let _data = await axios({
                method: "GET",
                url: `${this.url}/pix_recebimentos/v2/webhook?${urlParams.toString()}`,
                headers: {
                    'Authorization': this.bearer_token,
                },
                httpsAgent: this.httpsAgent,
            })
        } catch (error: any) {
            if (error?.response?.data) {
                console.log(JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
}