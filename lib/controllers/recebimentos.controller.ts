import { NextFunction, Request, Response } from "express"
import { GATEWAYS_PIX, RECEBIMENTO_CLASSIFICACAO, RecebimentosPixModel } from "../models/recebimentos-pix.model"
import { errorHandler, logDev } from "../util";
import dayjs from "dayjs";
import { PixModel } from "../models/pix.model";
import { SicoobIntegration } from "../integrations/sicoob";
import { LOJAS_TIPO_COMERCIO, LojasModel } from "../models/lojas.model";
import { INTEGRACOES_BANCOS, IntegracoesModel } from "../models/integracoes.model";
import { EfiIntegration } from "../integrations/efi";
import { processarListaPixs } from "./cronjobs.controller";
import { BradescoIntegration } from "../integrations/bradesco";
import { ItauIntegration } from "../integrations/itau";
import { SantanderIntegration } from "../integrations/santander";
import { RecebimentosPOSModel } from "../models/recebimentos-pos.model";

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
            // if (!!req.body?.classificacao) {
            //     $set['classificacao'] = req.body.classificacao;
            // } else {
            //     $unset['classificacao'] = "";
            // }
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
            if (req.body.loja) {
                let loja = await LojasModel.findOne({ _id: req.body.loja });
                if (!loja) throw new Error("Loja não encontrada");
                $set['loja'] = loja;
                if (loja?.tipo_comercio == LOJAS_TIPO_COMERCIO.ATACADO) {
                    $set['classificacao'] = RECEBIMENTO_CLASSIFICACAO.VENDA_ATACADO;
                }
                if (loja?.tipo_comercio == LOJAS_TIPO_COMERCIO.VAREJO || loja?.tipo_comercio == LOJAS_TIPO_COMERCIO.VAREJO_ATACADO) {
                    $set['classificacao'] = RECEBIMENTO_CLASSIFICACAO.VENDA_VAREJO;
                }
            } else {
                $unset['loja'] = "";
                $unset['classificacao'] = "";
            }
            await RecebimentosPixModel.updateOne(
                {
                    _id: req.body._id,
                    'empresa._id': String(req.empresa._id)
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
    getRecebimentosPOSSummary: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let filter: any = {
                'empresa._id': String(req.empresa._id),
            }
            if (req.query?.data_inicial && req.query?.data_final) {
                filter.data = {
                    $gte: dayjs(String(req.query.data_inicial)).add(3, 'h').toDate(),
                    $lte: dayjs(String(req.query.data_final)).add(3, 'h').toDate(),
                }
            }
            if (!!req.query?.status) filter['status'] = String(req.query.status);

            let total_valor_query = 0;
            let total_vendas_query = 0;
            let total_por_forma_pagamento: any[] = [];
            let response = await RecebimentosPOSModel.aggregate([
                {
                    $match: filter
                },
                {
                    $group: {
                        _id: "$forma_pagamento",
                        total_valor: { $sum: "$valor" },
                        total_vendas: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ])

            if (response?.length) {
                response.forEach((item: any) => {
                    total_valor_query += item.total_valor;
                    total_vendas_query += item.total_vendas;
                    total_por_forma_pagamento.push({
                        label: item?._id || "DESCONHECIDO",
                        total_valor: item.total_valor,
                        total_vendas: item.total_vendas
                    });
                });
            }

            let lista = await RecebimentosPOSModel.find(filter).sort({ data: 1 }).lean();

            let recebimentos_por_data: any = {};
            for (let l of lista) {
                let data_key = dayjs(l.data).add(-3, 'h').format('YYYY-MM-DD');
                if (!recebimentos_por_data[data_key]) {
                    recebimentos_por_data[data_key] = {
                        total_valor: 0,
                        total_vendas: 0,
                        formas_pagamento: {}
                    }
                }
                // @ts-ignore
                if (!recebimentos_por_data[data_key].formas_pagamento[l.forma_pagamento]) {
                    // @ts-ignore
                    recebimentos_por_data[data_key].formas_pagamento[l.forma_pagamento] = {
                        total_valor: 0,
                        total_vendas: 0
                    }
                }
                // @ts-ignore
                recebimentos_por_data[data_key].formas_pagamento[l.forma_pagamento].total_valor += l.valor;
                // @ts-ignore
                recebimentos_por_data[data_key].formas_pagamento[l.forma_pagamento].total_vendas += 1;
                recebimentos_por_data[data_key].total_valor += l.valor;
                recebimentos_por_data[data_key].total_vendas += 1;
            }

            res.json({
                total_valor_query,
                total_vendas_query,
                total_por_forma_pagamento,
                recebimentos_por_data,
                lista
            })
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getRecebimentosPOS: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;
            let filter: any = {
                'empresa._id': String(req.empresa._id),
            }
            if (req.query?.data_inicial && req.query?.data_final) {
                filter.data = {
                    $gte: dayjs(String(req.query.data_inicial)).add(3, 'h').toDate(),
                    $lte: dayjs(String(req.query.data_final)).add(3, 'h').toDate(),
                }
            }
            if (!!req.query?.status && req?.query?.status != 'TODOS') filter['status'] = String(req.query.status);
            if (!!req.query?.busca) {
                filter['$or'] = [
                    { 'order_id': { $regex: String(req.query.busca), $options: 'i' } },
                    { 'codigo_autorizacao': { $regex: String(req.query.busca), $options: 'i' } },
                    { 'pos_identificacao': { $regex: String(req.query.busca), $options: 'i' } }
                ]
            }
            if(!!req.query?.forma_pagamento && req?.query?.forma_pagamento != 'TODOS') filter['forma_pagamento'] = String(req.query.forma_pagamento);

            logDev("Filtro Recebimentos POS: ", filter);

            lista = await RecebimentosPOSModel.find(filter).sort({ data: -1 }).skip(skip).limit(perpage).lean();
            total = await RecebimentosPOSModel.countDocuments(filter);

            let total_valor_query = 0;
            let total_vendas_query = 0;
            let total_por_forma_pagamento: any[] = [];
            let response = await RecebimentosPOSModel.aggregate([
                {
                    $match: filter
                },
                {
                    $group: {
                        _id: "$forma_pagamento",
                        total_valor: { $sum: "$valor" },
                        total_vendas: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        _id: 1
                    }
                }
            ])

            if (response?.length) {
                response.forEach((item: any) => {
                    total_valor_query += item.total_valor;
                    total_vendas_query += item.total_vendas;
                    total_por_forma_pagamento.push({
                        label: item?._id || "DESCONHECIDO",
                        total_valor: item.total_valor,
                        total_vendas: item.total_vendas
                    });
                });
            }

            res.json({
                lista,
                total,
                total_valor_query,
                total_vendas_query,
                total_por_forma_pagamento
            })
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getRecebimentos: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req?.empresa?.controle_acesso?.ativado) {
                let dia_semana = dayjs().add(-3, 'h').day();
                let hora_atual = dayjs().add(-3, 'h').format('HH:mm');
                let acesso_permitido = false;
                let controle_acesso = req.empresa.controle_acesso;
                // a estrutura de 'controle_acesso' é uma array de horarios que contem dia_semana, hora_inicio e hora_fim
                for (let horario of controle_acesso.horarios) {
                    if (horario.dia === dia_semana && horario.ativado) {
                        // verificar se a hora atual está entre o hora_inicio e hora_fim
                        if (hora_atual >= horario.hora_inicio && hora_atual <= horario.hora_fim) {
                            logDev('Acesso permitido pelo controle de acesso');
                            acesso_permitido = true;
                            break;
                        }
                    }
                }
                if (!acesso_permitido) {
                    logDev("Fora do Horário de Acesso Permitido pelo Controle de Acesso da Empresa");
                    return res.json({ lista: [], total: 0 })
                }
            }
            if (req?.empresa?.limitar_dias_consulta) {
                let hoje = dayjs().add(-3, 'h').startOf('day');
                let data_consulta = req.query.data ? dayjs(String(req.query.data)).startOf('day') : hoje;
                let dias_passados = hoje.diff(data_consulta, 'day');
                if (dias_passados > req.empresa.max_dias_passados) {
                    logDev("Limite de dias para consulta excedido pela empresa");
                    return res.json({ lista: [], total: 0 })
                }
            }

            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;

            let data = req.query.data ? String(req.query.data) : null;
            let busca = req.query.busca ? String(req.query.busca).toLowerCase() : null;

            let filter: any = {
                'empresa._id': String(req.empresa._id)
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
                let is_loja_informada = item?.loja?._id;
                steps.push({
                    label: "Loja",
                    done: is_loja_informada ? true : false
                });
                item.steps = steps;
                return item;
            })
            let total_caixa_data = await RecebimentosPixModel.aggregate([
                {
                    $match: {
                        data_caixa: dayjs(data).toDate(),
                        classificacao: RECEBIMENTO_CLASSIFICACAO.VENDA_VAREJO,
                        'empresa._id': String(req.empresa._id)
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$valor" }
                    }
                }
            ]);

            let lojas = await LojasModel.find({ 'empresa._id': String(req.empresa._id) }).sort({ nome: 1 }).lean();

            let _caixas_lojas = await RecebimentosPixModel.aggregate([
                {
                    $match: {
                        'data_caixa': dayjs(data).toDate(),
                        'classificacao': { $in: [RECEBIMENTO_CLASSIFICACAO.VENDA_VAREJO, RECEBIMENTO_CLASSIFICACAO.VENDA_ATACADO] },
                        'loja._id': { $exists: true },
                        'empresa._id': String(req.empresa._id)
                    }
                },
                {
                    $group: {
                        _id: "$loja._id",
                        loja_nome: { $first: "$loja.nome" },
                        total: { $sum: "$valor" }
                    }
                }
            ]);

            let total_caixa_por_loja: any[] = [];
            for (let loja of lojas) {
                let caixa_loja = _caixas_lojas.find(c => String(c._id) === String(loja._id));
                total_caixa_por_loja.push({
                    loja_id: loja._id,
                    loja_nome: loja.nome,
                    total: caixa_loja ? caixa_loja.total : 0
                });
            }

            res.json({
                lista,
                total,
                total_caixa_data: total_caixa_data[0]?.total || 0,
                total_caixa_por_loja: total_caixa_por_loja,
                total_pendentes_processamento_data: await getRecebimentosPendentesStepsByDate(data!, String(req.empresa._id))
            });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    getPixs: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let lista = [], total = 0;
            let perpage = Number(req.query.perpage) || 10;
            let page = Number(req.query.page) || 1;
            let skip = (perpage * page) - perpage;

            let filter: any = {
                'empresa._id': String(req.empresa._id)
            }

            total = await PixModel.countDocuments(filter);
            lista = await PixModel.find(filter)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(perpage)
                .lean();

            res.json({
                lista,
                total
            });
        } catch (error) {
            errorHandler(error, res);
        }
    },
    createPix: async (req: Request, res: Response, next: NextFunction) => {
        try {
            let payload_pix: any = {
                calendario: {
                    expiracao: req.body.expiracao || 3600
                }
            }
            if (!req.body?.valor) {
                throw new Error("Valor do PIX é obrigatório");
            }
            payload_pix.valor = {
                original: req.body.valor.toFixed(2)
            }
            if (!!req.body?.cpf_cliente) {
                if (!req.body?.cpf_cliente) throw new Error("CPF do cliente é obrigatório");
                payload_pix.devedor = {
                    nome: req.body.nome_cliente,
                    cpf: req.body.cpf_cliente
                }
            }
            if (!!req.body?.cnpj_cliente) {
                if (!req.body?.cnpj_cliente) throw new Error("CNPJ do cliente é obrigatório");
                payload_pix.devedor = {
                    nome: req.body.nome_cliente,
                    cnpj: req.body.cnpj_cliente
                }
            }
            if (!!req.body?.descricao) {
                payload_pix.solicitacaoPagador = req.body.descricao;
            }
            // let sicoob = new SicoobIntegration();
            // await sicoob.init();
            // let data = await sicoob.gerarPix(payload_pix);
            // let novoPix = new PixModel({
            //     ...data,
            //     expira_em: dayjs().add(payload_pix.calendario.expiracao, 'second').toDate(),
            //     gateway: GATEWAYS_PIX.SICOOB
            // });
            // await novoPix.save();
            // console.log(
            //     JSON.stringify({
            //         ...novoPix.toObject()
            //     }, null, 2)
            // );
            // res.json(novoPix);
            res.json({});
        } catch (error) {
            errorHandler(error, res);
        }
    }
}



async function getRecebimentosPendentesStepsByDate(data: string, empresa_id?: string) {
    let total = 0;

    let response = await RecebimentosPixModel.aggregate([
        {
            $match: {
                'empresa._id': empresa_id ? empresa_id : { $exists: true },
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
                    { nota_baixada_sistema: { $exists: false } },
                    { loja: { $exists: false } }
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