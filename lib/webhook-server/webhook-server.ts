
import fs from "fs";
import express from "express";
import https from "https";
import { TLSSocket } from "tls";
import { logDev } from "../util";

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

app.get("/", (req, res, next) => {
    res.json("Online!");
})

// Endpoint para recepção do webhook com tratamento de autorização mútua
app.post("/pix/webhook", (request, response) => {
    let tslSocket = request.socket as TLSSocket;
    if (tslSocket?.authorized) {
        console.log(LOG_LEVEL, "Client Certificate Authorized!");
        let { body } = request;
        if (body && body.pix) {
            for (let item of body.pix) {
                console.log(LOG_LEVEL, "Received a body authorized", JSON.stringify(item, null, 2))
            }
        }
        response.status(200).end();
    } else {
        response.status(401).end();
    }
});

// Endpoint para recepção do webhook sem tratar a autorização
app.post("/pix/webhook-2", (request, response) => {
    let { body } = request;
    if (body && body.pix) {
        for (let item of body.pix) {
            console.log(LOG_LEVEL, "Received a body not authorized", JSON.stringify(item, null, 2))
        }
    }
    response.status(200).end();
})

httpsServer.listen(PORT, () => {
    console.log("App online at:", PORT)
})

// Login Machine
// gcloud compute ssh --zone "us-central1-f" "webhook-getnet" --project "kingingressosv3"