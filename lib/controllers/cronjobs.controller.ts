import { Request, Response } from "express";
import { errorHandler } from "../util"
import { SicoobIntegration } from "../integrations/sicoob";
import dayjs from "dayjs";
import { GATEWAYS_PIX, RecebimentosPixModel } from "../models/recebimentos-pix.model";

export default {
    syncSicoobPixRecebidos: async (data = "") => {
        try {
            let hoje = dayjs().add(-3, 'h').format("YYYY-MM-DD");
            if (data) hoje = dayjs(data as string).format("YYYY-MM-DD");
            let sicoob = new SicoobIntegration();
            await sicoob.authorize();
            let lista: any[] = await sicoob.consultaPixRecebidos(hoje, hoje) || [];

            let updates: any[] = [];
            try {
                lista.forEach(element => {
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
            } catch (error) { }
            await RecebimentosPixModel.bulkWrite(updates, { ordered: false });
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