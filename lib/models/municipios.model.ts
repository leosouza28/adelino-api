import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    id: Number,
    nome: String,
    estado: {
        id: Number,
        sigla: String,
        nome: String,
        regiao: {
            id: Number,
            sigla: String,
            nome: String
        }
    }
});

export const MunicipiosModel = mongoose.model("municipios-estados", ModelSchema);
