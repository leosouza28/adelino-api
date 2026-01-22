import { Request, Response } from "express";
import { errorHandler, logDev } from "../util"
import { SicoobIntegration } from "../integrations/sicoob";
import dayjs from "dayjs";
import { GATEWAYS_PIX, RecebimentosPixModel } from "../models/recebimentos-pix.model";
import { PIX_STATUS, PixModel } from "../models/pix.model";
import { messaging } from "../integrations/firebase";
import { UsuariosModel } from "../models/usuarios.model";
import { EmpresasModel } from "../models/empresas.model";
import { INTEGRACOES_BANCOS, IntegracoesModel } from "../models/integracoes.model";
import { ItauIntegration } from "../integrations/itau";
import { BradescoIntegration } from "../integrations/bradesco";
import { SantanderIntegration } from "../integrations/santander";
import { EfiIntegration } from "../integrations/efi";

export async function ajustaEmpresaPedro() {
    let empresa_pedro = await EmpresasModel.findOne({ _id: "6963abe535c325bb9cf34355" }).lean();
    if (!empresa_pedro) {
        return;
    }
    console.log("Iniciando ajuste para a empresa Pedro...");
    await RecebimentosPixModel.updateMany(
        {
            'empresa._id': { $exists: false },
        },
        {
            $set: {
                empresa: empresa_pedro
            }
        }
    )
    await PixModel.updateMany(
        {
            'empresa._id': { $exists: false },
        },
        {
            $set: {
                empresa: empresa_pedro
            }
        }
    )
    console.log("Ajuste concluído para a empresa Pedro.");
}


export default {

    syncIntegracao: async (req: Request, res: Response) => {
        try {
            let { sku, data } = req.params;
            let dataParam = data || dayjs().add(-3, 'h').format("YYYY-MM-DD");
            let hoje = dayjs(dataParam as string).format("YYYY-MM-DD");
            let integracao = await IntegracoesModel.findOne({ sku }).lean();
            if (!integracao) {
                throw new Error("Integração não encontrada para o SKU informado.");
            }
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
            res.json(true);
        } catch (error) {
            errorHandler(error, res);
        }
    },
    syncEmpresaIntegracoes: async (req: Request, res: Response) => {
        try {
            let integracoes = await IntegracoesModel.find({ 'empresa._id': String(req.empresa._id) });
            if (!integracoes.length) return;
            let agora = dayjs().add(-3, 'h').format('YYYY-MM-DD');
            let lista_pix: any[] = [];
            await Promise.all(
                integracoes.map(async (integracao) => {
                    // logDev(`Iniciando sincronização da integração: ${integracao.nome} - Banco: ${integracao.banco}`);
                    if (integracao?.banco === INTEGRACOES_BANCOS.EFI) {
                        // Process EFI specific logic
                        let efi = new EfiIntegration();
                        await efi.init(integracao._id.toString());
                        lista_pix = await efi.getRecebimentos(agora, agora)
                        await processarListaPixs(lista_pix, integracao);
                    }
                    if (integracao?.banco == INTEGRACOES_BANCOS.BRADESCO) {
                        // Process Bradesco specific logic
                        let bradesco = new BradescoIntegration();
                        await bradesco.init(integracao._id.toString());
                        lista_pix = await bradesco.getRecebimentos(agora, agora)
                        await processarListaPixs(lista_pix, integracao);
                    }
                    if (integracao?.banco == INTEGRACOES_BANCOS.ITAU) {
                        // Process Itau specific logic
                        let itau = new ItauIntegration();
                        await itau.init(integracao._id.toString());
                        lista_pix = await itau.getRecebimentos(agora, agora, processarListaPixs)
                    }
                    if (integracao?.banco == INTEGRACOES_BANCOS.SANTANDER) {
                        // Process Santander specific logic
                        let santander = new SantanderIntegration();
                        await santander.init(integracao._id.toString());
                        lista_pix = await santander.getRecebimentos(agora, agora)
                        await processarListaPixs(lista_pix, integracao);
                    }
                    if (integracao?.banco == INTEGRACOES_BANCOS.SICOOB) {
                        // Process Sicoob specific logic
                        let sicoob = new SicoobIntegration();
                        await sicoob.init(integracao._id.toString());
                        lista_pix = await sicoob.getRecebimentos(agora, agora)
                        await processarListaPixs(lista_pix, integracao);
                    }
                })
            )
            logDev("Sincronização de integrações finalizada.");
            res.json(true);
        } catch (error) {
            console.error("Erro ao sincronizar integrações:", error);
        }
    },
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
            let response = await messaging.sendEach(messages);
            for (let responseItem of response.responses) {
                if (responseItem.error) {
                    console.error("Erro ao enviar notificação:", responseItem.error);
                }
            }
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
export async function processarListaPixs(lista: any[], integracao: any) {
    let updates: any[] = [];
    let baixas_pixs: any[] = [];
    try {
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
        // logDev("Processando", updates.length, "registros de PIX recebidos...");
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