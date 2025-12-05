import { NextFunction, Request, Response } from "express";
import compiler from "../integrations/handlebars/compiler";
import pdfApi from "../integrations/pdf-api";
import { errorHandler, logDev } from "../util";


export default {
    getRelatorios: async (req: Request, res: Response, next: NextFunction) => {
        let html_error = compiler('error', {})
        try {
            logDev(req.query)
            let { id, output, ...params } = req.query;
            output = output || 'html';
            let html: any;

            switch (id) {
                case 'vendas-por-periodo':
                    // html = await getRelatorioVendasPorPeriodo(params, req.usuario);
                    break;
                default:
                    throw new Error('Relatório não encontrado');
            }

            if (output == 'pdf') {
                let response: any = await pdfApi(html, 'pdf', `rel-vendas-por-periodo.pdf`);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="rel-vendas-por-periodo.pdf"`);
                res.send(response.data)
            } else {
                res.json(html);
            }
        } catch (error) {
            errorHandler(error, res);
        }
    },
}

