import dayjs from "dayjs";
import { Request, Response } from "express";
import { processarListaPixs } from "../handlers/sync-integracoes";
import { BradescoIntegration } from "../integrations/bradesco";
import { EfiIntegration } from "../integrations/efi";
import { ItauIntegration } from "../integrations/itau";
import { SantanderIntegration } from "../integrations/santander";
import { SicoobIntegration } from "../integrations/sicoob";
import { EmpresasModel } from "../models/empresas.model";
import { INTEGRACOES_BANCOS, IntegracoesModel } from "../models/integracoes.model";
import { PixModel } from "../models/pix.model";
import { RecebimentosPixModel } from "../models/recebimentos-pix.model";
import { logDev } from "../util";

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