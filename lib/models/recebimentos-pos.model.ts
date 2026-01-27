import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    order_id: String,
    data: Date,
    data_aprovacao: Date,
    data_liberacao: Date,
    valor: Number,
    pos_tipo: String,
    pos_identificacao: String,
    codigo_autorizacao: String,
    forma_pagamento: String,
    cartao: {
        primeiros_seis_digitos: String,
        ultimos_quatro_digitos: String,
        tags: [String],
    },
    status: String,
    status_rejeicao: String,
    status_rejeicao_descricao: String,
    gateway: String,
    pagador: {
        id: String,
        documento: {
            tipo: String,
            numero: String,
        },
        nome: String,
        email: String
    },

    loja: {
        _id: String,
        nome: String
    },

    empresa: {
        _id: String,
        nome: String,
    }

}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const RecebimentosPOSModel = mongoose.model("recebimentos-pos", ModelSchema);

export const GATEWAY_POS_MAQUINA = {
    MERCADO_PAGO: "MERCADO PAGO",
}
export const GATEWAY_FORMA_PAGAMENTO = {
    'account_money': "SALDO DO GATEWAY",
    'pix': "PIX",
    'credit_card': "CREDITO",
    'debit_card': "DEBITO",
}
export const GATEWAY_STATUS_PAGAMENTO = {
    "APROVADO": "APROVADO",
    "NAO_AUTORIZADO": "NAO AUTORIZADO",
    "ESTORNADO": "ESTORNADO",
}

export const GATEWAY_STATUS_REJEICAO_DETAIL = {
    '': "NÃO IDENTIFICADO",
    'cc_rejected_bad_filled_security_code': "Código de segurança inválido",
    'cc_rejected_insufficient_amount': "Saldo insuficiente",
}