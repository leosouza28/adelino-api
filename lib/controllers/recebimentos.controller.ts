import { NextFunction, Request, Response } from "express"
import { RECEBIMENTO_CLASSIFICACAO, RecebimentosPixModel } from "../models/recebimentos-pix.model"
import { errorHandler } from "../util";
import dayjs from "dayjs";

export default {
    atualizarRecebimento: async (req: Request, res: Response, next: NextFunction) => {
        try {

            let $unset: any = {};
            let $set: any = {};
            if (!!req.body?.data_caixa) {
                $set['data_caixa'] = req.body.data_caixa;
            } else {
                $unset['data_caixa'] = "";
            }
            if (!!req.body?.classificacao) {
                $set['classificacao'] = req.body.classificacao;
            } else {
                $unset['classificacao'] = "";
            }
            if (req.body.cupom_fiscal_emitido) {
                $set['cupom_fiscal_emitido'] = req.body.cupom_fiscal_emitido;
                $set['cupom_fiscal_alteracao'] = {
                    value: req.body.cupom_fiscal_emitido,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            } else {
                $unset['cupom_fiscal_emitido'] = "";
                $unset['cupom_fiscal_alteracao'] = {
                    value: req.body.cupom_fiscal_emitido,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            }
            if (req.body.nota_fiscal_emitida) {
                $set['nota_fiscal_emitida'] = req.body.nota_fiscal_emitida;
                $set['nota_fiscal_alteracao'] = {
                    value: req.body.nota_fiscal_emitida,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            } else {
                $unset['nota_fiscal_emitida'] = "";
                $unset['nota_fiscal_alteracao'] = {
                    value: req.body.nota_fiscal_emitida,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            }
            if (req.body.nota_baixada_sistema) {
                $set['nota_baixada_sistema'] = req.body.nota_baixada_sistema;
                $set['nota_baixada_sistema_alteracao'] = {
                    value: req.body.nota_baixada_sistema,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            } else {
                $unset['nota_baixada_sistema'] = "";
                $unset['nota_baixada_sistema_alteracao'] = {
                    value: req.body.nota_baixada_sistema,
                    usuario: req.usuario,
                    data_hora: dayjs().toDate()
                }
            }
            await RecebimentosPixModel.updateOne(
                {
                    _id: req.body._id
                },
                {
                    $set,
                    $unset
                }
            )
            res.json(true);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getRecebimentos: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;

            let data = req.query.data ? String(req.query.data) : null;
            let busca = req.query.busca ? String(req.query.busca).toLowerCase() : null;


            let filter: any = {

            }
            if (req.query.tipo_data === 'caixa') {
                filter.data_caixa = {
                    $gte: dayjs(data).toDate(),
                    $lte: dayjs(data).toDate()
                }
            }
            if (req.query.tipo_data === 'pix') {
                filter.horario = {
                    $gte: dayjs(data).startOf('day').add(3, 'h').toDate(),
                    $lte: dayjs(data).endOf('day').add(3, 'h').toDate()
                }
            }
            if (!!busca) {
                filter = {
                    ...filter,
                    $or: [
                        { "pagador.nome": { $regex: busca, $options: 'i' } },
                        { "pagador.cpf": { $regex: busca, $options: 'i' } },
                        { "pagador.cnpj": { $regex: busca, $options: 'i' } }
                    ]
                }
            }

            total = await RecebimentosPixModel.countDocuments(filter);
            lista = await RecebimentosPixModel.find(filter)
                .sort({ horario: -1 })
                .skip(skip)
                .limit(perpage)
                .lean();

            lista.map((item: any) => {
                let steps = [];
                if (!item?.classificacao) {
                    steps.push({ label: 'Classificação', done: false });
                } else {
                    steps.push({ label: 'Classificação', done: true });
                }
                let is_data_caixa_informada = item?.data_caixa;
                steps.push({
                    label: "Data do Caixa",
                    done: is_data_caixa_informada ? true : false
                });
                let is_cupom_or_nota_emitida = item?.cupom_fiscal_emitido || item?.nota_fiscal_emitida;
                if (!is_cupom_or_nota_emitida) {
                    steps.push({
                        label: "Emissão Cupom/Nota Fiscal",
                        done: is_cupom_or_nota_emitida ? true : false
                    });
                } else {
                    steps.push({
                        label: "Emissão Cupom/Nota Fiscal",
                        done: true
                    });
                }
                let is_baixado_sistema = item?.nota_baixada_sistema;
                if (!is_baixado_sistema) {
                    steps.push({
                        label: "Baixa no Sistema",
                        done: is_baixado_sistema ? true : false
                    });
                } else {
                    steps.push({
                        label: "Baixa no Sistema",
                        done: true
                    });
                }
                item.steps = steps;
                return item;
            })
            let total_caixa_data = await RecebimentosPixModel.aggregate([
                {
                    $match: {
                        data_caixa: dayjs(data).toDate()
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$valor" }
                    }
                }
            ]);


            res.json({
                lista,
                total,
                total_caixa_data: total_caixa_data[0]?.total || 0,
                total_pendentes_processamento_data: await getRecebimentosPendentesStepsByDate(data!)
            });
        } catch (error) {
            errorHandler(error, res);
        }
    }
}



async function getRecebimentosPendentesStepsByDate(data: string) {
    let total = 0;

    let response = await RecebimentosPixModel.aggregate([
        {
            $match: {
                horario: {
                    $gte: dayjs(data).startOf('day').add(3, 'h').toDate(),
                    $lte: dayjs(data).endOf('day').add(3, 'h').toDate()
                },
                $or: [
                    { classificacao: { $exists: false } },
                    { data_caixa: { $exists: false } },
                    {
                        $and: [
                            { cupom_fiscal_emitido: { $exists: false } },
                            { nota_fiscal_emitida: { $exists: false } }
                        ]
                    },
                    { nota_baixada_sistema: { $exists: false } }
                ]
            }
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ]);

    if (response.length > 0) {
        total = response[0].count;
    }
    return total
}