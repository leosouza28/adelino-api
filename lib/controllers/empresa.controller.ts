import { NextFunction, Request, Response } from "express";
import { EmpresasModel } from "../models/empresas.model";
import { errorHandler } from "../util";

export default {
    getEmpresaData: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let { id } = req.params;
            let empresa = await EmpresasModel.findOne({ _id: id });
            if (!empresa) {
                throw new Error("Empresa não encontrada");
            }
            res.json(empresa)
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getEmpresaByCodigoAtivacao: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let empresa = await EmpresasModel.findOne({ codigo_acesso: req.params.id });
            if (!empresa) {
                throw new Error("Código de ativação inválido");
            }
            res.json(empresa);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getConfiguracoesEmpresa: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let empresa = await EmpresasModel.findOne({ _id: req.empresa._id });
            res.json(empresa);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    postConfiguracoesEmpresa: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let empresa = await EmpresasModel.findOne({ _id: req.empresa._id });
            if (!empresa) throw new Error("Empresa não encontrada");
            await EmpresasModel.updateOne({ _id: empresa._id }, {
                $set: {
                    logo: req.body.logo || empresa.logo,
                    nome: req.body.nome || empresa.nome,
                    razao_social: req.body.razao_social || empresa.razao_social,
                    doc_type: req.body.doc_type || empresa.doc_type,
                    documento: req.body.documento || empresa.documento,
                    endereco: req.body.endereco || empresa.endereco,
                    telefones: req.body.telefones || empresa.telefones,
                    email: req.body.email || empresa.email,
                    juros: req.body.juros || empresa.juros,
                    multa: req.body.multa || empresa.multa,
                }
            });
            res.json({ message: "Configurações atualizadas com sucesso" });
        } catch (error) {
            errorHandler(error, res);
        }
    },
}