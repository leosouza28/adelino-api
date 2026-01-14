
import fs from "fs";
import express from "express";
import https from "https";
import http from "http";
import axios from "axios";
import path from "path";

const app = express();

const pem_cert = "/opt/trackpix/ssl/webhook.trackpix.com.br/fullchain.pem";
const key_cert = "/opt/trackpix/ssl/webhook.trackpix.com.br/privkey.pem";

var options: any = {};

if (process.env.DEV !== "1") {
    let path_to_prod_cert: string = '';
    if (process.env.PROD_CERT_PATH !== undefined) {
        path_to_prod_cert = path.join(__dirname, process.env.PROD_CERT_PATH).toString();
    }
    options = {
        cert: fs.readFileSync(pem_cert), // Certificado fullchain do dominio
        key: fs.readFileSync(key_cert), // Chave privada do domínio
        requestCert: true,
        rejectUnauthorized: false, //Mantenha como false para que os demais endpoints da API não rejeitem requisições sem MTLS
    }
    // Só adiciona o CA se o arquivo existir
    if (path_to_prod_cert !== '' && fs.existsSync(path_to_prod_cert)) {
        options.ca = fs.readFileSync(path_to_prod_cert);
        console.log("CA certificate loaded from:", path_to_prod_cert);
    } else if (path_to_prod_cert !== '') {
        console.log("CA certificate not found at:", path_to_prod_cert, "- starting without it");
    }
}

var server = null
if (process.env.DEV == "1") {
    server = http.createServer(options, app);
} else {
    server = https.createServer(options, app);
}

const PORT = process.env.PORT || 8010;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use((req, res, next) => {
    console.log("Received request", req.method, (req?.route || "/"));
    next();
})

app.post("/pix", async (req, res, next) => {
    console.log("POSTTED AT /pix")
    console.log(JSON.stringify(req.body, null, 2));
    try {

    } catch (error) {
        console.log("Falha ao notificar no webhook");
    }
    res.status(200).end();
})

app.post("/", async (req, res, next) => {
    console.log("POSTTED AT /")
    try {
        console.log("SUCCESS_BODY:", JSON.stringify(req.body, null, 2));
        console.log("SUCCESS_QUERY:", JSON.stringify(req.query, null, 2));
    } catch (error) {
        console.log("Falha ao notificar no webhook!");
    }
    res.status(200).end();
})

app.get("/", (req, res, next) => {
    res.json("Online!");
})

server.listen(PORT, () => {
    console.log("App online at:", PORT)
})