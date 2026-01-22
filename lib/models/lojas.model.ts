import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    nome: String,
    tipo_comercio: String,
    empresa: {
        _id: String,
        nome: String
    },
    criada_por: {
        usuario: {
            _id: String,
            nome: String,
        },
        data_hora: Date
    },
    atualizado_por: {
        usuario: {
            _id: String,
            nome: String,
        },
        data_hora: Date
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const LojasModel = mongoose.model("lojas", ModelSchema);

export const LOJAS_TIPO_COMERCIO = {
    'VAREJO': 'VAREJO',
    'ATACADO': 'ATACADO',
    'VAREJO_ATACADO': 'VAREJO_ATACADO',
}