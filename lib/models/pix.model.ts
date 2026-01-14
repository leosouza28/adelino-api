import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    calendario: {
        criacao: Date,
        expiracao: Number
    },
    status: String,
    txid: String,
    revisao: Number,
    location: String,
    devedor: {
        nome: String,
        cnpj: String
    },
    valor: {
        original: String,
        modalidadeAlteracao: Number
    },
    pix: {
        endToEndId: String,
        txid: String,
        valor: String,
        horario: Date,
        nomePagador: String,
        pagador: {
            nome: String,
            cpf: String
        },
        devolucoes: [
            {
                id: String,
                rtrId: String,
                valor: String,
                natureza: String,
                horario: {
                    solicitacao: Date,
                    liquidacao: Date
                },
                status: String
            }
        ]
    },
    chave: String,
    solicitacaoPagador: String,
    brcode: String,
    gateway: String,
    expira_em: Date,
    empresa: {
        _id: String,
        nome: String
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const PixModel = mongoose.model("pixes", ModelSchema);

export const PIX_GATEWAYS = {
    SICOOB: 'SICOOB',
    // BANCO_DO_BRASIL: 'BB',
    // ITAU: 'ITAU',
    // INTER: 'INTER',
    // BRADESCO: 'BRADESCO',
    // SANTANDER: 'SANTANDER',
    // PICPAY: 'PICPAY'
}

export const PIX_STATUS = {
    ATIVO: 'ATIVO',
    CONCLUIDO: 'CONCLUIDO',
    EXPIRADO: 'EXPIRADO',
    DEVOLVIDO: 'DEVOLVIDO'
}