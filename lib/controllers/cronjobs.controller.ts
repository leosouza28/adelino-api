import { Request, Response } from "express";
import { errorHandler } from "../util"
import { SicoobIntegration } from "../integrations/sicoob";
import dayjs from "dayjs";
import { GATEWAYS_PIX, RecebimentosPixModel } from "../models/recebimentos-pix.model";
import { PIX_STATUS, PixModel } from "../models/pix.model";
import { messaging } from "../integrations/firebase";
import { UsuariosModel } from "../models/usuarios.model";

export default {
    syncSicoobPixRecebidos: async (data = "") => {
        try {
            let hoje = dayjs().add(-3, 'h').format("YYYY-MM-DD");
            if (data) hoje = dayjs(data as string).format("YYYY-MM-DD");
            let sicoob = new SicoobIntegration();
            await sicoob.authorize();
            let lista: any[] = await sicoob.consultaPixRecebidos(hoje, hoje) || [];

            console.log(lista.length, "PIXs recebidos do Sicoob para o dia", hoje);

            let updates: any[] = [];
            let baixas_pixs: any = [];
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
                        console.log(`Pix ${element.endToEndId} totalmente devolvido. Removendo do sistema.`);
                        updates.push({
                            deleteOne: {
                                filter: {
                                    endToEndId: element.endToEndId
                                }
                            }
                        });
                        return; // Pula para o próximo elemento
                    }
                    element.horario = dayjs(element.horario).toDate();
                    updates.push({
                        updateOne: {
                            filter: {
                                endToEndId: element.endToEndId
                            },
                            update: {
                                $set: {
                                    ...element,
                                    gateway: GATEWAYS_PIX.SICOOB,
                                    last_sync: dayjs().toDate()
                                }
                            },
                            upsert: true
                        }
                    })
                });
            } catch (error) {
                console.log(error);
            }
            await RecebimentosPixModel.bulkWrite(updates, { ordered: false });
            await Promise.all(
                baixas_pixs.map(async (txid: string) => {
                    await baixaPixSicoob(txid, sicoob);
                })
            );
            await notificarPixRecebidos();

            return {
                success: true,
                data: lista,
                total: lista.length
            }
        } catch (error) {
            throw error;
        }
    }
}

export async function notificarPixRecebidos() {
    try {
        let _pixes_hoje_nao_notificados = await RecebimentosPixModel.find({
            createdAt: {
                $gte: dayjs().startOf('day').toDate(),
            },
            notificado: {
                $exists: false
            }
        });
        if (_pixes_hoje_nao_notificados.length == 0) return;

        let users = await UsuariosModel.find({}).lean();
        let messages: any[] = [];
        for (let user of users) {
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
                    }
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