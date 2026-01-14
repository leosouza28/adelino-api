import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    nome: String,
    scopes: [String],
    empresa: {
        _id: String,
        nome: String
    },
    criado_por: {
        usuario: {
            _id: String,
            nome: String
        },
        data_hora: Date
    },
    atualizado_por: {
        usuario: {
            _id: String,
            nome: String
        },
        data_hora: Date
    }
}, {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt"
    }
});

export const PerfisModel = mongoose.model("perfis", ModelSchema);