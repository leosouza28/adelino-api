import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    pos_tipo: String,
    pos_identificacao: String,
    gateway: String,
    ultima_venda: Date,
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

export const POSModel = mongoose.model("pos", ModelSchema);
