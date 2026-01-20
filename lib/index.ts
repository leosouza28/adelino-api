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
import cronjobsController, { ajustaEmpresaPedro, processarListaPixs } from './controllers/cronjobs.controller';
import { messaging } from './integrations/firebase';
import { USUARIO_MODEL_STATUS, USUARIO_MODEL_TIPO_TELEFONE, USUARIO_NIVEL, UsuariosModel } from './models/usuarios.model';
import { startDB } from './populations';
import { EmpresasModel } from './models/empresas.model';
import { LojasModel } from './models/lojas.model';
import usuariosController from './controllers/usuarios.controller';
import { PerfisModel } from './models/perfis.model';
import { INTEGRACOES_BANCOS, IntegracoesModel } from './models/integracoes.model';
import { BradescoIntegration } from './integrations/bradesco';
import { ItauIntegration } from './integrations/itau';
import bcrypt from 'bcrypt';
import { EfiIntegration } from './integrations/efi';
import { SantanderIntegration } from './integrations/santander';

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

async function criarEmpresaNova(
    nome: string, cnpj: string,
    codigo_ativacao: string,
    nome_proprietario: string,
    cpf_proprietario: string,
    username_proprietario: string,
    telefone_proprietario: string,
    senha_proprietario: string = 'xpto1234',
    generate_proprietario: boolean = true
) {
    try {
        let empresa = await EmpresasModel.findOne({ documento: cnpj });
        if (empresa) throw new Error("Empresa já existe");
        let codigo_existe = await EmpresasModel.findOne({ codigo_ativacao: codigo_ativacao });
        if (codigo_existe) throw new Error("Código de ativação já está em uso");
        let _empresa = new EmpresasModel({
            nome: nome,
            nome_fantasia: nome,
            razao_social: nome,
            documento: cnpj,
            codigo_ativacao: codigo_ativacao,
        });
        await _empresa.save();
        let perfil_admin = new PerfisModel({
            empresa: _empresa,
            nome: "Administrador",
            scopes: ['*'],
        });
        await perfil_admin.save();
        console.log(JSON.stringify({
            _id: _empresa._id.toString(),
            nome: _empresa.nome,
            perfil: {
                _id: perfil_admin._id.toString(),
                nome: perfil_admin.nome,
                scopes: perfil_admin.scopes
            },
            ativo: true
        }, null, 2))
        if (generate_proprietario) {
            let usuario_admin = new UsuariosModel({
                empresas: [
                    {
                        ..._empresa.toJSON(),
                        perfil: perfil_admin,
                        ativo: true
                    }
                ],
                documento: cpf_proprietario,
                username: username_proprietario,
                nome: nome_proprietario,
                doc_type: 'cpf',
                senha: bcrypt.hashSync(senha_proprietario, 10),
                status: USUARIO_MODEL_STATUS.ATIVO,
                niveis: [USUARIO_NIVEL.ADMIN],
                origem_cadastro: "SISTEMA",
                telefone_principal: {
                    tipo: USUARIO_MODEL_TIPO_TELEFONE.CEL_WHATSAPP,
                    valor: telefone_proprietario,
                },
                telefones: [
                    {
                        tipo: USUARIO_MODEL_TIPO_TELEFONE.CEL_WHATSAPP,
                        valor: telefone_proprietario,
                        principal: true
                    }
                ],
                criado_por: {
                    data_hora: dayjs().toDate(),
                    usuario: {
                        _id: "SISTEMA",
                        nome: "SISTEMA",
                        username: "SISTEMA"
                    }
                }
            });
            await usuario_admin.save();
        }
        logDev("Empresa criada com sucesso:", _empresa.nome);
    } catch (error) {
        console.log("Falha ao criar a empresa", error)
    }
}

async function addEmpresasToAdmin() {
    try {
        let admin = await UsuariosModel.findOne({ username: 'admin' });
        let empresas = await EmpresasModel.find();
        let __empresas = [];
        for (let empresa of empresas) {
            let perfil_admin = await PerfisModel.findOne({ 'empresa._id': empresa._id.toString(), nome: "Administrador" });
            __empresas.push({
                ...empresa.toJSON(),
                perfil: perfil_admin,
                ativo: true
            });
        }
        await UsuariosModel.updateOne(
            {
                _id: admin!._id
            },
            {
                $set: {
                    empresas: __empresas
                }
            }
        )
        logDev("Added empresas to admin user");
    } catch (error) {
        console.log(error);
    }
}

async function start() {
    try {
        await mongoose.connect(DB_URL);
        server.listen(PORT, async () => {
            console.log(`Server is running on port ${PORT}`);
            // await addEmpresasToAdmin();
            // await criarEmpresaNova(
            //     'CENTER MIX',
            //     '',
            //     '0001003',
            //     'Leonardo Souza',
            //     '02581748206',
            //     'leosouza',
            //     '91983045923',
            //     '1234'
            // )
            // startDB();
            try {
                // let integracao = await IntegracoesModel.findOne({ sku: "centermix" });
                // let itau = new ItauIntegration();
                // let response = await itau.init(integracao!._id.toString());
                // await itau.getWebhooks();
                // await itau.setWebhook();
                // let data = "2026-01-20";
                // await itau.getRecebimentos(data, data, processarListaPixs);

                // let dias_pra_tras = 90;
                // for (let i = 0; i <= dias_pra_tras; i++) {
                //     logDev(`Buscando recebidos do Itau para o dia ${dayjs().add(-i, 'day').format("YYYY-MM-DD")}...`);
                //     let data = dayjs().add(-i, 'day').format("YYYY-MM-DD");
                //     await itau.getRecebimentos(data, data, processarListaPixs);
                // }

                // let integracao = await IntegracoesModel.findOne({ sku: "centernorth" });
                // let bradescoIntegracao = new BradescoIntegration();
                // await bradescoIntegracao.init(integracao?._id.toString() || '');
                // await bradescoIntegracao.setWebhook();
                // await bradescoIntegracao.getWebhooks();
                
                // let dias_pra_tras = 90;
                // for (let i = 0; i <= dias_pra_tras; i++) {
                //     let data = dayjs().add(-i, 'day').format("YYYY-MM-DD");
                //     let response = await bradescoIntegracao.getRecebimentos(data, data);
                //     await processarListaPixs(response, integracao!)
                // }

                // let integracao = await IntegracoesModel.findOne({sku: "sicoobadelino1"});
                // let sicoob = new SicoobIntegration();
                // let response = await sicoob.init(integracao!._id.toString());
                // await sicoob.setWebhook();
                // await sicoob.getWebhooks();


            } catch (error) {
                console.log('@@@', error);
            }


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


// ClientID:
// hOqTuUjZJzLZiHGOTxUPqYVo9cIKuAGf
// ClientSecret:
// QwYJhHAgbXhjFfPB