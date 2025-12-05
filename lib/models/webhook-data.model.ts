import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    payload_type: String,
    pix: [
        {
            endToEndId: String,
            txid: String,
            valor: String,
            componentesValor: {
                original: {
                    valor: String
                }
            },
            chave: String,
            horario: String,
            infoPagador: String,
            pagador: {
                cpf: String,
                cnpj: String,
                nome: String
            }
        }
    ]
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const WebhookDataModel = mongoose.model("webhooks-datas", ModelSchema);
