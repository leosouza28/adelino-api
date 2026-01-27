import dayjs from "dayjs";
import { INTEGRACOES_BANCOS, IntegracoesModel } from "../models/integracoes.model"
import { ItauIntegration } from "../integrations/itau";
import { EfiIntegration } from "../integrations/efi";
import { SicoobIntegration } from "../integrations/sicoob";
import { BradescoIntegration } from "../integrations/bradesco";
import { SantanderIntegration } from "../integrations/santander";
import { MercadoPagoPayments } from "../integrations/mercadopago/mp-payments";
import { delayTimer, logDev } from "../util";
import { RECEBIMENTO_CLASSIFICACAO, RecebimentosPixModel } from "../models/recebimentos-pix.model";
import { UsuariosModel } from "../models/usuarios.model";
import { GATEWAY_FORMA_PAGAMENTO, GATEWAY_POS_MAQUINA, GATEWAY_STATUS_PAGAMENTO, GATEWAY_STATUS_REJEICAO_DETAIL, RecebimentosPOSModel } from "../models/recebimentos-pos.model";
import { POSModel } from "../models/pos.model";
import { PIX_STATUS, PixModel } from "../models/pix.model";

export default async () => {
    try {
        let integracoes = await IntegracoesModel.find({ active: true }).lean();
        let _data = dayjs().add(-3, 'h').format("YYYY-MM-DD");
        let promises = integracoes.map(async (integracao) => syncIntegracao(integracao!, _data));
        try {
            await Promise.allSettled(promises);
        } catch (error) {
            console.error(error);
        }
        logDev("Sincronização de integrações concluída.");
    } catch (error) {
        console.error('Error at sync', error);
    }
}


async function syncIntegracao(integracao: any, data: string) {
    try {
        let dataParam = data || dayjs().add(-3, 'h').format("YYYY-MM-DD");
        let hoje = dayjs(dataParam as string).format("YYYY-MM-DD");
        if (integracao.banco == INTEGRACOES_BANCOS.ITAU) {
            let itau = new ItauIntegration();
            await itau.init(integracao._id.toString());
            await itau.getRecebimentos(hoje, hoje, processarListaPixs) || [];
            // Itaú é Diferente para poder Conciliar
        }
        if (integracao.banco == INTEGRACOES_BANCOS.EFI) {
            let efi = new EfiIntegration();
            await efi.init(integracao._id.toString());
            let lista: any[] = await efi.getRecebimentos(hoje, hoje);
            await processarListaPixs(lista, integracao);
        }
        if (integracao.banco == INTEGRACOES_BANCOS.SICOOB) {
            let sicoob = new SicoobIntegration();
            await sicoob.init(integracao._id.toString());
            let lista: any[] = await sicoob.getRecebimentos(hoje, hoje) || [];
            await processarListaPixs(lista, integracao);
        }
        if (integracao.banco == INTEGRACOES_BANCOS.BRADESCO) {
            let bradesco = new BradescoIntegration();
            await bradesco.init(integracao._id.toString());
            let lista: any[] = await bradesco.getRecebimentos(hoje, hoje) || [];
            await processarListaPixs(lista, integracao);
        }
        if (integracao.banco == INTEGRACOES_BANCOS.SANTANDER) {
            try {
                let santander = new SantanderIntegration();
                await santander.init(integracao._id.toString());
                let lista: any[] = await santander.getRecebimentos(hoje, hoje) || [];
                await processarListaPixs(lista, integracao);
            } catch (error) {
                logDev("Erro ao sincronizar Santander:", error);
            }
        }
        if (integracao.banco == INTEGRACOES_BANCOS.MERCADO_PAGO_PAYMENTS_POS) {
            let times = 3;
            for (let i = 0; i < times; i++) {
                try {
                    let mp = new MercadoPagoPayments();
                    await mp.init(integracao._id.toString());
                    let lista: any[] = await mp.getRecebimentos(hoje, hoje) || [];
                    await processarListaPOS(lista, integracao);
                    await delayTimer(1000);
                } catch (error) {
                    logDev("Erro ao sincronizar Santander:", error);
                }
            }
        }
    } catch (error) {
        throw error;
    }
}


export async function notificarPixRecebidos(empresa_id: string) {
    try {
        let _pixes_hoje_nao_notificados = await RecebimentosPixModel.find({
            'createdAt': {
                $gte: dayjs().startOf('day').toDate(),
            },
            'notificado': {
                $exists: false
            },
            'empresa._id': empresa_id
        });
        if (_pixes_hoje_nao_notificados.length == 0) return;

        let users = await UsuariosModel.find({ 'empresas._id': empresa_id }).lean();
        let messages: any[] = [];
        for (let user of users) {
            // @ts-ignore
            if (user?.scopes?.includes('notificacao.pix_recebido') || user?.scopes?.includes('*')) {
                let payload = {
                    notification: {
                        title: "PIX Recebido!",
                        body: `Você recebeu mais ${_pixes_hoje_nao_notificados.length} PIXs hoje!`,
                    },
                };
                for (let t of user.tokens || []) {
                    messages.push({
                        token: t,
                        ...payload
                    });
                }
            }
        }
        if (messages.length > 0) {
            // let response = await messaging.sendEach(messages);
            // for (let responseItem of response.responses) {
            //     if (responseItem.error) {
            //         console.error("Erro ao enviar notificação:", responseItem.error);
            //     }
            // }
            // Marcar os PIXs como notificados
            await RecebimentosPixModel.updateMany(
                {
                    createdAt: {
                        $gte: dayjs().startOf('day').toDate(),
                    },
                    notificado: {
                        $exists: false
                    },
                    'empresa._id': empresa_id
                },
                {
                    $set: {
                        notificado: true
                    }
                }
            );
            console.log("Notificações enviadas com sucesso!");
        }

    } catch (error) {
        console.log(error);
    }
}

export async function processarListaPOS(lista: any[], integracao: any) {
    let updates: any[] = [];
    let updates_pos: any[] = [];
    try {
        let indexed_pos = {};

        lista.forEach(element => {
            let payload = {
                order_id: '',
                data: null as Date | null,
                data_aprovacao: null as Date | null,
                data_liberacao: null as Date | null,
                valor: 0,
                pos_tipo: '',
                pos_identificacao: '',
                codigo_autorizacao: '',
                forma_pagamento: '',
                cartao: {
                    primeiros_seis_digitos: '',
                    ultimos_quatro_digitos: '',
                    tags: [] as string[],
                },
                gateway: '',
                status: '',
                status_rejeicao: '',
                status_rejeicao_descricao: '',
                pagador: {
                    id: '',
                    documento: {
                        tipo: '',
                        numero: '',
                    },
                    nome: '',
                    email: ''
                },
                empresa: integracao.empresa
            };
            if (integracao?.banco === INTEGRACOES_BANCOS.MERCADO_PAGO_PAYMENTS_POS) {
                payload.gateway = GATEWAY_POS_MAQUINA.MERCADO_PAGO;
                payload.valor = element.transaction_amount || 0;
                payload.data = dayjs(element.date_created).toDate();

                if (element?.point_of_interaction?.type === 'POINT') {
                    payload.pos_tipo = 'MP_POINT';
                    payload.pos_identificacao = element.point_of_interaction.device.serial_number || 'NOT_IDENTIFIED';
                }
                if (element?.point_of_interaction?.device?.manufacturer === 'PAX') {
                    payload.pos_tipo = 'MP_POINT_PAX';
                    payload.pos_identificacao = element.point_of_interaction.device.serial_number || 'NOT_IDENTIFIED';
                }
                if (element?.point_of_interaction?.device?.manufacturer === 'NEWLAND') {
                    payload.pos_tipo = 'MP_POINT_NEWLAND';
                    payload.pos_identificacao = element.point_of_interaction.device.serial_number || 'NOT_IDENTIFIED';
                }

                // @ts-ignore
                if (payload.pos_identificacao !== '' && !indexed_pos[payload.pos_identificacao]) {
                    // @ts-ignore
                    indexed_pos[payload.pos_identificacao] = { ultima_venda: null };
                }

                if (element?.date_approved) payload.data_aprovacao = dayjs(element.date_approved).toDate();
                if (element?.money_release_date) payload.data_liberacao = dayjs(element.money_release_date).toDate();

                if (element?.order?.id) payload.order_id = element.order.id;
                if (!payload?.order_id && element?.id) payload.order_id = element.id;

                if (element?.payment_method?.id === 'pix') {
                    payload.forma_pagamento = GATEWAY_FORMA_PAGAMENTO.pix;
                }
                if (!payload?.forma_pagamento && element?.payment_method?.type === 'credit_card') {
                    payload.forma_pagamento = GATEWAY_FORMA_PAGAMENTO.credit_card;
                }
                if (!payload?.forma_pagamento && element?.payment_method?.type === 'debit_card') {
                    payload.forma_pagamento = GATEWAY_FORMA_PAGAMENTO.debit_card;
                }
                if (!payload?.forma_pagamento && element?.payment_method?.type === 'account_money') {
                    payload.forma_pagamento = GATEWAY_FORMA_PAGAMENTO.account_money;
                }
                if (element?.authorization_code) payload.codigo_autorizacao = element.authorization_code;
                if (element?.card) {
                    payload.cartao.primeiros_seis_digitos = element.card.first_six_digits || '';
                    payload.cartao.ultimos_quatro_digitos = element.card.last_four_digits || '';
                    payload.cartao.tags = element.card.tags || [];
                }
                if (element?.payer) {
                    payload.pagador.id = element.payer.id || '';
                    if (element.payer?.identification) {
                        payload.pagador.documento.tipo = element.payer.identification.type || '';
                        payload.pagador.documento.numero = element.payer.identification.number || '';
                    }
                    if (element?.payer?.first_name || element?.payer?.last_name) {
                        payload.pagador.nome = `${element?.payer?.first_name || ''} ${element?.payer?.last_name || ''}`.trim();
                    }
                    payload.pagador.email = element.payer.email || '';
                }

                if (element?.status === 'approved') {
                    payload.status = GATEWAY_STATUS_PAGAMENTO.APROVADO;
                }
                if (element?.status == 'rejected') {
                    payload.status = GATEWAY_STATUS_PAGAMENTO.NAO_AUTORIZADO;
                    // @ts-ignore
                    payload.status_rejeicao_descricao = GATEWAY_STATUS_REJEICAO_DETAIL[element?.status_detail || ''];

                }

                updates.push(
                    {
                        updateOne: {
                            filter: {
                                order_id: payload.order_id
                            },
                            update: {
                                $set: {
                                    ...payload,
                                }
                            },
                            upsert: true
                        }
                    }
                )

                if (payload.pos_identificacao) {
                    updates_pos.push({
                        updateOne: {
                            filter: {
                                pos_identificacao: payload.pos_identificacao,
                            },
                            update: {
                                $set: {
                                    pos_tipo: payload.pos_tipo,
                                    pos_identificacao: payload.pos_identificacao,
                                    gateway: GATEWAY_POS_MAQUINA.MERCADO_PAGO,
                                    empresa: integracao.empresa,
                                }
                            },
                            upsert: true
                        }
                    })
                }
            }
        })
        let hoje_ref = dayjs().startOf('day');
        // Verificar na lista, a ultima venda de cada POS
        let updates_last_venda = [];
        for (let pos_identificacao of Object.keys(indexed_pos)) {
            let _last_venda_approved = lista.filter(item =>
                (item.point_of_interaction?.device?.serial_number === pos_identificacao ||
                    item.point_of_interaction?.type === 'POINT' && item.point_of_interaction.device.serial_number === pos_identificacao) &&
                item.status === 'approved'
            )
                .sort((a, b) => {
                    let dateA = dayjs(a.date_approved);
                    let dateB = dayjs(b.date_approved);
                    if (dateA.isBefore(dateB)) return 1;
                    if (dateA.isAfter(dateB)) return -1;
                    return 0;
                })[0];
            // Verifica se é maior que o hoje_ref
            let is_maior_que_hoje = false;
            if (_last_venda_approved) {
                let date_approved = dayjs(_last_venda_approved.date_approved);
                if (date_approved.isAfter(hoje_ref)) {
                    is_maior_que_hoje = true;
                }
            }
            if (_last_venda_approved && is_maior_que_hoje) {
                // @ts-ignore
                indexed_pos[pos_identificacao].ultima_venda = dayjs(_last_venda_approved.date_approved).toDate();
                // @ts-ignore
                updates_last_venda.push({
                    updateOne: {
                        filter: {
                            pos_identificacao: pos_identificacao,
                        },
                        update: {
                            $set: {
                                // @ts-ignore
                                ultima_venda: indexed_pos[pos_identificacao].ultima_venda,
                            }
                        },
                    }
                })
            }
        }
        if (updates.length) {
            logDev("Processando", updates.length, "registros de POS recebidos...");
            await RecebimentosPOSModel.bulkWrite(updates, { ordered: false });
            logDev("Registros processados com sucesso.");
        }
        if (updates_pos?.length) {
            logDev("Atualizando", updates_pos.length, "registros de POS...");
            await POSModel.bulkWrite(updates_pos, { ordered: false });
            logDev("Registros de POS atualizados com sucesso.");
        }
        if (updates_last_venda.length) {
            logDev("Atualizando", updates_last_venda.length, "registros de ultima venda POS...");
            await POSModel.bulkWrite(updates_last_venda, { ordered: false });
            logDev("Registros de ultima venda POS atualizados com sucesso.");
        }
        await IntegracoesModel.updateOne(
            {
                _id: integracao._id
            },
            {
                $set: {
                    last_sync: dayjs().toDate()
                }
            }
        )
    } catch (error) {
        console.log("error", error);
    }
}

export async function processarListaPixs(lista: any[], integracao: any) {
    let updates: any[] = [];
    let baixas_pixs: any[] = [];
    try {
        let loja = null, loja2 = null;
        if (integracao?.empresa?._id === '6974e70ec0b2e9c31ada2c71') {
            loja = {
                _id: "6974f0cea0d0170390648826",
                nome: "SITE PALPITIN",
                empresa: integracao.empresa
            }
            loja2 = {
                _id: "6974f475aa6971a7f2bb1688",
                nome: "MAGO LOCACOES",
                empresa: integracao.empresa
            }
        }
        lista.forEach(element => {
            // Verifica o valor da devolucao, se for igual ao valor do pix, remover do sistema
            let valor_pix = Number(element.valor);
            let valor_devolucao = 0;
            if (element.devolucoes && element.devolucoes.length > 0) {
                valor_devolucao = element.devolucoes.reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
            }
            if (element?.txid?.length == 32) {
                baixas_pixs.push(element.txid);
            }
            if (valor_pix === valor_devolucao) {
                // console.log(`Pix ${element.endToEndId} totalmente devolvido. Removendo do sistema.`);
                updates.push({
                    deleteOne: {
                        filter: {
                            endToEndId: element.endToEndId
                        }
                    }
                });
                return; // Pula para o próximo elemento
            }
            if (integracao?.banco === INTEGRACOES_BANCOS.ITAU || integracao?.banco === INTEGRACOES_BANCOS.SANTANDER) {
                element.horario = dayjs(element.horario).add(3, 'h').toDate();
            } else {
                element.horario = dayjs(element.horario).toDate();
            }
            if (loja) {
                // Para PIX do MagoLocações atribuir loja específica
                if (element.chave === integracao.chave_pix) {
                    element.loja = loja;
                    element.data_caixa = dayjs(element.horario).add(-3, 'h').startOf('day').toDate();
                    element.classificacao = RECEBIMENTO_CLASSIFICACAO.VENDA_VAREJO;
                }
                if (element.chave !== integracao.chave_pix) {
                    element.loja = loja2;
                    element.data_caixa = dayjs(element.horario).add(-3, 'h').startOf('day').toDate();
                    element.classificacao = RECEBIMENTO_CLASSIFICACAO.VENDA_VAREJO;
                }
            }
            updates.push({
                updateOne: {
                    filter: {
                        endToEndId: element.endToEndId
                    },
                    update: {
                        $set: {
                            ...element,
                            chave_pix_utilizada: element?.chave || '',
                            empresa: integracao.empresa,
                            gateway: integracao.banco,
                            last_sync: dayjs().toDate()
                        }
                    },
                    upsert: true
                }
            })
        });
        logDev("Processando", updates.length, "registros de PIX recebidos...");
        await RecebimentosPixModel.bulkWrite(updates, { ordered: false });
        // logDev("Registros processados com sucesso.");
        try {
            if (baixas_pixs.length > 0 && integracao.banco === INTEGRACOES_BANCOS.SICOOB) {
                let sicoob = new SicoobIntegration();
                await sicoob.init(integracao._id.toString());
                await Promise.all(
                    baixas_pixs.map(async (txid: string) => {
                        await baixaPixSicoob(txid, sicoob);
                    })
                );
            }
        } catch (error) {
            console.error(`Error at Baixa PIXs: ${error}`);
        }
        try {
            await notificarPixRecebidos(integracao.empresa._id);
        } catch (error) {
            console.error(`Error at Notificar PIXs: ${error}`);
        }
        try {
            await IntegracoesModel.updateOne(
                {
                    _id: integracao._id
                },
                {
                    $set: {
                        last_sync: dayjs().toDate()
                    }
                }
            )
        } catch (error) {
            console.log("Erro ao atualizar last_sync da integração:", error);
        }
    } catch (error) {
        console.log(error);
    }
}


export async function baixaPixSicoob(txid: string, sicoob: SicoobIntegration) {
    try {
        let response = await sicoob.consultaPix(txid);

        let valor_original = Number(response.valor.valor_original);
        let valor_devolucao = 0;
        let pix = response.pix[0];
        if (pix.devolucoes && pix.devolucoes.length > 0) {
            valor_devolucao = pix.devolucoes.reduce((acc: number, curr: any) => acc + Number(curr.valor), 0);
        }
        if (valor_original == valor_devolucao) {
            await PixModel.updateOne(
                {
                    txid: txid
                },
                {
                    $set: {
                        status: PIX_STATUS.DEVOLVIDO
                    }
                }
            )
        }
        if (valor_original && valor_devolucao == 0 && response.status == PIX_STATUS.CONCLUIDO) {
            await PixModel.updateOne(
                {
                    txid: txid
                },
                {
                    $set: {
                        status: PIX_STATUS.CONCLUIDO
                    }
                }
            )
        }
        return;
    } catch (error) {
        console.log(error);
    }
}