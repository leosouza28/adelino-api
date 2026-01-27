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

export class MercadoPagoPayments {

    development: boolean = true;
    url: string = '';
    bearer_token: string = ''
    integracao: any = {};

    constructor() {
        this.development = false;
    }
    async init(integracao_id: string) {
        try {
            let integracao = await IntegracoesModel.findById(integracao_id);
            if (!integracao) throw new Error('Integração não encontrada');
            this.integracao = integracao;
            this.url = 'https://api.mercadopago.com';
            let bearer_token = integracao.bearer_token || '';
            if (!bearer_token) throw new Error('Bearer token não configurado na integração');
            return { success: 1, initializated: true }
        } catch (error: any) {
            return { success: 0, error: error?.message || "Erro desconhecido" }
        }
    }

    async getRecebimentos(dataInicial: string, dataFinal: string) {
        try {
            let recebimentos: any[] = [];
            let limit = 1000; // Limite padrão do Mercado Pago
            let offset = 0;
            
            logDev(`Buscando recebimentos MercadoPago entre ${dataInicial} e ${dataFinal}`);
            
            let totalRecebimentos = 0;
            
            do {
                let params = new URLSearchParams();
                params.append('sort', 'date_created');
                params.append('criteria', 'desc');
                params.append('range', 'date_created');
                params.append('begin_date', `${dataInicial}T00:00:00.00Z`);
                params.append('end_date', `${dataFinal}T23:59:59.99Z`);
                params.append('limit', limit.toString());
                params.append('offset', offset.toString());

                let response = await axios({
                    url: `${this.url}/v1/payments/search?${params.toString()}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `${this.integracao.bearer_token}`,
                    }
                });
                
                if (response.data && response.data.paging) {
                    totalRecebimentos = response.data.paging.total;
                }
                
                if (response.data && response.data.results && Array.isArray(response.data.results)) {
                    recebimentos = recebimentos.concat(response.data.results);
                }
                
                offset += limit;
                
            } while (offset < totalRecebimentos);
            
            return recebimentos;
        } catch (error: any) {
            throw error;
        }
    }
}