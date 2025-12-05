import mongoose from "mongoose";
import { USUARIO_DEFAULT_VALUES_INPUT } from "./usuarios.model";

const ModelSchema = new mongoose.Schema({
    key: String,
    descricao: String,
    plano: {
        _id: String,
        nome: String,
        codigo: String,
        assinatura: Date,
        vencimento: Date,
        qtd_dependentes: Number,
        status: String,
        status_bloqueio: String,
        categoria: {
            _id: String,
            nome: String,
            dependentes: Number,
            descricao: String
        }
    },
    dependente: {
        ...USUARIO_DEFAULT_VALUES_INPUT
    },
    usuario: {
        _id: String,
        nome: String,
        documento: String
    }

}, {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt"
    }
});

export const LogsModel = mongoose.model("logs", ModelSchema);

export const LOGS_KEY = {
    TRANSFERENCIA_PLANO: "TRANSFERENCIA DE PLANO",
    BLOQUEIO_DEPENDENTE: "BLOQUEIO DE DEPENDENTE",
    DESBLOQUEIO_DEPENDENTE: "DESBLOQUEIO DE DEPENDENTE",
    ADICAO_DEPENDENTE: "ADICAO DE DEPENDENTE",
    REMOCAO_DEPENDENTE: "REMOCAO DE DEPENDENTE",
    EDICAO_PLANO: "DADOS DO PLANO EDITADOS",
    TROCA_VENDEDOR_PLANO: "TROCA DE VENDEDOR DO PLANO",
}


export const insertLog = async (key: String, descricao: string, plano: any, dependente: any, usuario: any) => {
    const log = new LogsModel({
        key,
        descricao,
        plano,
        dependente,
        usuario
    });
    log.save().catch();
}