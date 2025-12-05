import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({

}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const ConfiguracoesModel = mongoose.model("configuracoes", ModelSchema);
