import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    nome_empresa: String,
    cnpj: String,
    nome_proprietario: String,
    telefone: String,
    cidade: String,
    cupom_indicacao: String,
    connection_data: {
        user_agent: String,
        origin: String,
        country: String,
        region: String,
        city: String,
        latlng: Number,
        location: {
            latitude: Number,
            longitude: Number
        },
        ip: String,
    },
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const InteresseModel = mongoose.model("interesses", ModelSchema);
