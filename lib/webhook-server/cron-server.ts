import 'dotenv/config';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import schedule from 'node-schedule';
import syncIntegracoes from '../handlers/sync-integracoes';
import { logDev } from '../util';

const packageJson = require('../../package.json');

const server = express();

server.use(bodyParser.json({ limit: '10mb' }));
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cors());
server.use(fileUpload())

var PORT: number = 3000;
var url: string = process.env.DB_URL || '';

if (!!process.env?.PORT) PORT = Number(process.env.PORT);


async function startTasks() {
    console.log(`TP Crons |  DB: ${url}}`)
    mongoose.set('maxTimeMS', 120000);
    mongoose.connect(url);
    mongoose.connection.once("open", async () => {


        server.listen(PORT, async () => {
            console.log(`CronServer is running on port ${PORT} | ${packageJson.version}`);
            let isCronOnline = process.env.CRON_ON === '1' ? true : false;
            console.log({ isCronOnline })
            if (isCronOnline) {
                // A cada 1 minuto, sincroniza os pagamentos das integrações ativas
                schedule.scheduleJob('*/1 * * * *', async () => {
                    try {
                        await syncIntegracoes();
                    } catch (error) {
                        console.log("Erro ao sincronizar integrações:", error);
                    }
                });

            }
        });


    })
    mongoose.connection.once("close", async () => {
        console.log("Closed connection!");
        process.exit(0)
    })
}

startTasks()


// gcloud compute ssh --zone "us-central1-a" "nodeapps@punk-node" --project "kingingressosv3"