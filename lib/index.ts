import bodyParser from 'body-parser';
import cors from 'cors';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import 'dotenv/config';
import express from 'express';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import path from 'path';
import routes from './routes';
import { logDev } from './util';
import { SicoobIntegration } from './integrations/sicoob';
import cronjobsController from './controllers/cronjobs.controller';

dayjs.locale('pt-br');

const server = express(),
    PORT = process.env.DEV === "1" ? process.env.DEV_PORT : process.env.PORT,
    DB_URL = process.env.DB_URL!;

if (!DB_URL) process.exit(1);

let static_path = path.join(__dirname, 'public');
server.use(express.static(static_path));

server.use(fileUpload());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cors());
server.use(detectFetchAndBody);
server.use(resolveHeaders);
server.use(routes);


async function start() {
    try {
        await mongoose.connect(DB_URL);
        server.listen(PORT, async () => {
            console.log(`Server is running on port ${PORT}`);
            // startDB();
            // let resultado = await cronjobsController.syncSicoobPixRecebidos("2025-12-05");
            // console.log(`  > Sucesso! Total de ${resultado.total} registros sincronizados.`);
            // let dias_pra_tras = 36;
            // let data_limite = "2025-12-06"
            // for (let i = dias_pra_tras; i >= 0; i--) {
            //     let data = dayjs().add(-i, 'day').format("YYYY-MM-DD");
            //     if (data > data_limite) {
            //         continue;
            //     }
            //     console.log(`Sincronizando PIXs recebidos do Sicoob para o dia ${data}...`);
            //     try {
            //         let resultado = await cronjobsController.syncSicoobPixRecebidos(data);
            //         console.log(`  > Sucesso! Total de ${resultado.total} registros sincronizados.`);
            //     } catch (error) {
            //         console.log(`  > Erro ao sincronizar os registros:`, error);
            //     }
            // }


        });
    } catch (error) {
        console.log('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

start();

function resolveHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
    let userAgent = req.headers["user-agent"];
    let appVersion = req.headers["app-version"];
    let appPlatform = req.headers["app-platform"];
    if (userAgent?.includes("Google")) {
        return next();
    }
    if (userAgent?.includes('Dart')) {
        userAgent = 'EstrelaDalvaApp';
        if (appVersion && appPlatform) {
            userAgent += `/${appVersion} (${appPlatform})`;
        }
    }
    let payload: any = {
        user_agent: userAgent,
        origin: 'not defined',
        country: req.headers['x-appengine-country'],
        city: req.headers['x-appengine-city'],
        region: req.headers['x-appengine-region'],
        latlng: req.headers['x-appengine-latlng'],
        ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    }
    if (userAgent?.includes('EstrelaDalvaApp')) {
        payload.origin = 'EstrelaDalvaApp';
    }
    payload.ip = payload.ip?.replace('::ffff:', '');
    if (!!req?.path) {
        payload['path'] = req.path;
        payload['method'] = req.method.toUpperCase();
    }

    if (payload?.latlng && payload?.latlng != '0.000000,0.000000') {
        payload.location = {
            latitude: payload.latlng.split(",")[0],
            longitude: payload.latlng.split(",")[1],
        }
    }

    let connection_data: any = {};
    for (let item in payload) {
        if (payload[item] != undefined && payload[item] != null) {
            connection_data[item] = payload[item];
        }
    }
    if (payload.origin == 'not defined' && req.headers['origin']) {
        connection_data.origin = req.headers['origin'];
    }
    if (process.env.DEV === "1") {
        console.log('Connection Data:', connection_data);
    }
    req.connection_data = connection_data;
    next();
}

function printRoutes() {
    let rotas: any[] = [];
    routes.stack.forEach((route: any) => {
        let stack: any[] = route.handle.stack;
        stack.forEach((r) => {
            rotas.push({
                method: Object.keys(r.route.methods)[0].toUpperCase(),
                path: r.route.path,
            })
        })
    });
    let _rotas = rotas.map((r) => `${r.method} ${r.path}`).join("\n");
}
function detectFetchAndBody(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.headers['content-type'] === 'application/json' && (req.method === 'POST' || req.method == 'PUT')) {
        const body = req.body;
        if (body && typeof body === 'object') {
            const fetchBody = JSON.stringify(body, null, 2);
            logDev(`${req.method} | ${req.path}`);
            logDev(fetchBody);
            const requestSizeInMB = Buffer.byteLength(fetchBody, 'utf8') / (1024 * 1024);
            logDev('Request size in MB:', requestSizeInMB.toFixed(2));
        }
    }
    next();
}