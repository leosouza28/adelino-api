import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    sku: String,
    nome: String,
    banco: String,

    scopes: String,
    
    client_id: String,
    client_secret: String,

    path_certificado: String,
    bearer_token: String,
    last_bearer_token_update: Date,

    path_certificado_dev: String,
    bearer_token_dev: String,
    last_bearer_token_update_dev: Date,

    chave_pix: String,
    
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

export const IntegracoesModel = mongoose.model("integracoes", ModelSchema);

export const INTEGRACOES_BANCOS = {
    BRADESCO: 'BRADESCO',
    SICOOB: 'SICOOB',
    ITAU: 'ITAU',
    SANTANDER: 'SANTANDER'
}
