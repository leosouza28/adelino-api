import 'dotenv/config';
import dayjs from "dayjs";
import express from "express";
import fs from "fs";
import https from "https";
import { TLSSocket } from "tls";
import { processarListaPixs } from "../controllers/cronjobs.controller";
import { BradescoIntegration } from "../integrations/bradesco";
import { EfiIntegration } from "../integrations/efi";
import { ItauIntegration } from "../integrations/itau";
import { SantanderIntegration } from "../integrations/santander";
import { SicoobIntegration } from "../integrations/sicoob";
import { INTEGRACOES_BANCOS, IntegracoesModel } from "../models/integracoes.model";
import { errorHandler } from "../util";

const app = express();

const pem_cert = "/etc/letsencrypt/live/webhook.trackpix.com.br/fullchain.pem";
const key_cert = "/etc/letsencrypt/live/webhook.trackpix.com.br/privkey.pem";

const httpsOptions: any = {
    cert: fs.readFileSync(pem_cert), // Certificado fullchain do dominio
    key: fs.readFileSync(key_cert), // Chave privada do domínio
    minVersion: "TLSv1.2",
    requestCert: true,
    rejectUnauthorized: false, //Mantenha como false para que os demais endpoints da API não rejeitem requisições sem MTLS
};
let cert_efi = fs.readFileSync(__dirname + '/certificates/cert-efi.crt');
let cert_itau = fs.readFileSync(__dirname + '/certificates/cert-itau.crt');
httpsOptions.ca = [cert_efi, cert_itau]; // Adicione os certificados das instituições financeiras aqui

const httpsServer = https.createServer(httpsOptions, app);
const PORT = 443;
const LOG_LEVEL = process.env.LOG_LEVEL || "DEFAULT";

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
    console.log("Received request:", req.method, req.url, req.body);
    next()
})

interface IPixWebhook {
    endToEndId: string;
    valor?: number;
    chave?: string;
}

async function initiateWebhookProcessing(pix: IPixWebhook) {
    try {
        let { chave } = pix;
        if (!chave) {
            console.log("No key found in PIX webhook data");
            return;
        }
        let integracao = await IntegracoesModel.findOne({ chave_pix: chave });
        if (!integracao) {
            console.log("No integration found for PIX key:", chave);
            return;
        }
        let agora = dayjs().add(-3, 'h').format('YYYY-MM-DD');
        let lista_pix = [];
        // Continue processing the webhook data as needed
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
    } catch (error) {
        throw error;
    }
}

app.get("/", (req, res, next) => {
    res.json("Online!");
})

app.post("/webhook", async (request, response) => {
    try {
        console.log(LOG_LEVEL, "PIX Webhook Config Received", request.body);
        response.status(200).end();
    } catch (error) {
        errorHandler(error, response);
    }
});

app.post("/webhook/pix", async (request, response) => {
    try {
        console.log(LOG_LEVEL, "Webhook Received Successfully", request.body);
        let tslSocket = request.socket as TLSSocket;
        if (tslSocket?.authorized) {
            let { body } = request;
            console.log(LOG_LEVEL, JSON.stringify(body, null, 2));
            if (body && body.pix) {
                for (let item of body.pix) {
                    initiateWebhookProcessing(item);
                }
            }
            response.status(200).end();
        } else {
            response.status(401).end();
        }
    } catch (error) {
        errorHandler(error, response);
    }
});
app.post("/webhook/sicoob", (request, response) => {
    try {
        console.log(LOG_LEVEL, "PIX Sicoob Webhook Config Received", request.body)
        response.status(200).end();
    } catch (error) {
        errorHandler(error, response);
    }
});
app.post("/webhook/sicoob/pix", (request, response) => {
    try {
        console.log(LOG_LEVEL, "PIX Sicoob Webhook Received", request.body)
        let { body } = request;
        console.log(LOG_LEVEL, JSON.stringify(body, null, 2));
        response.status(200).end();
    } catch (error) {
        errorHandler(error, response);
    }
});

httpsServer.listen(PORT, () => {
    console.log("App online at:", PORT)
})

// gcloud compute ssh --zone "us-central1-f" "webhook-getnet" --project "kingingressosv3"