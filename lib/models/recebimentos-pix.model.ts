import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    endToEndId: String,
    valor: Number,
    horario: Date,
    nomePagador: String,
    pagador: {
        nome: String,
        cpf: String,
        cnpj: String,
    },
    devolucoes: [],
    gateway: String,
    last_sync: Date,
    
    // Informações manipuláveis
    data_caixa: Date,
    classificacao: String,
    cupom_fiscal_emitido: Boolean,
    cupom_fiscal_alteracao: {
        value: Boolean,
        usuario: {
            _id: String,
            nome: String,
            username: String,
            documento: String
        },
        data_hora: Date,
    },
    nota_fiscal_emitida: Boolean,
    nota_fiscal_alteracao: {
        value: Boolean,
        usuario: {
            _id: String,
            nome: String,
            username: String,
            documento: String
        },
        data_hora: Date,
    },
    nota_baixada_sistema: Boolean,
    nota_baixada_sistema_alteracao: {
        value: Boolean,
        usuario: {
            _id: String,
            nome: String,
            username: String,
            documento: String
        },
        data_hora: Date,
    },
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const RecebimentosPixModel = mongoose.model("recebimentos-pixes", ModelSchema);

export const GATEWAYS_PIX = {
    SICOOB: 'SICOOB',
}

export const RECEBIMENTO_CLASSIFICACAO = {
    VENDA_ATACADO: 'VENDA ATACADO',
    VENDA_VAREJO: 'VENDA VAREJO',
}