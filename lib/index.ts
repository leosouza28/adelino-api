import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import cors from 'cors';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import 'dotenv/config';
import express from 'express';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import path from 'path';
import { EmpresasModel } from './models/empresas.model';
import { PerfisModel } from './models/perfis.model';
import { USUARIO_MODEL_STATUS, USUARIO_MODEL_TIPO_TELEFONE, USUARIO_NIVEL, UsuariosModel } from './models/usuarios.model';
import routes from './routes';
import { logDev } from './util';
import { processarListaPOS } from './handlers/sync-integracoes';
import { MercadoPagoPayments } from './integrations/mercadopago/mp-payments';
import { IntegracoesModel } from './models/integracoes.model';
import { RecebimentosPOSModel } from './models/recebimentos-pos.model';
import { POSModel } from './models/pos.model';

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
            //     'CELSO DA SILVA EVENTOS',
            //     '34154936000199',
            //     '021004',
            //     'SANDRO ROCHA',
            //     '99999999999',
            //     'sandro',
            //     '21964352376',
            //     '1234',
            //     false
            // )

            // NEW MAGO -> BONSUCESSO CARTELA
            // MAGO LOCACOES -> VB BONSUCESSO
            // ECLIPSE -> BOTAFOGO
            // CELSO -> BOTAFOGO A ALVIN


            try {
                // let empresa_alterar_nome = await EmpresasModel.findOne({ documento: "61681788000133" })
                // if (empresa_alterar_nome) {
                //     let novo_nome = 'BOTAFOGO';
                //     let empresa_id_string = empresa_alterar_nome._id.toString();
                //     await EmpresasModel.updateOne(
                //         {
                //             _id: empresa_id_string
                //         },
                //         {
                //             $set: {
                //                 nome: novo_nome,
                //                 nome_fantasia: novo_nome,
                //             }
                //         }
                //     )
                //     await IntegracoesModel.updateOne(
                //         {
                //             'empresa._id': empresa_id_string,
                //         },
                //         {
                //             $set: {
                //                 'empresa.nome': novo_nome,
                //             }
                //         }
                //     )
                //     await PerfisModel.updateMany(
                //         {
                //             'empresa._id': empresa_id_string,
                //         },
                //         {
                //             $set: {
                //                 'empresa.nome': novo_nome,
                //             }
                //         }
                //     )
                //     await UsuariosModel.updateMany(
                //         {
                //             'empresas._id': empresa_id_string,
                //         },
                //         {
                //             $set: {
                //                 'empresas.$.nome': novo_nome,
                //             }
                //         }
                //     )
                //     await RecebimentosPOSModel.updateMany(
                //         {
                //             'empresa._id': empresa_id_string,
                //         },
                //         {
                //             $set: {
                //                 'empresa.nome': novo_nome,
                //             }
                //         }
                //     )
                //     await POSModel.updateMany(
                //         {
                //             'empresa._id': empresa_id_string,
                //         },
                //         {
                //             $set: {
                //                 'empresa.nome': novo_nome,
                //             }
                //         }
                //     )
                //     logDev("Nome da empresa alterado com sucesso para:", novo_nome);
                // }


                // let integracao = await IntegracoesModel.findOne({ sku: "magolocacoesltda_mp_payments" });
                // let mp = new MercadoPagoPayments();
                // await mp.init(integracao!._id.toString());
                // let times = 3;
                // let dias_para_tras = 30;
                // for (let i = 0; i <= dias_para_tras; i++) {
                //     let data = dayjs().add(-i, 'day').format("YYYY-MM-DD");
                //     for (let j = 0; j < times; j++) {
                //         logDev(`Processando recebimentos do dia ${data}`);
                //         let response = await mp.getRecebimentos(data, data);
                //         await processarListaPOS(response, integracao!);
                //     }
                // }



                // let integracao = await IntegracoesModel.findOne({ sku: "magolocacoes" });
                // let itau = new ItauIntegration();
                // await itau.init(integracao!._id.toString());

                // let dias_passado = 90; 
                // for (let i = 0; i <= dias_passado; i++) {
                //     let data = dayjs().add(-i, 'day').format("YYYY-MM-DD");
                //     let response = await itau.getRecebimentos(data, data);
                //     await processarListaPixs(response, integracao!)
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


// MAGO LOCACOES
// PK
// APP_USR-c1d534d6-54ee-43d2-aa29-49da159bbd0d
// ATKON
// APP_USR-5055251177435748-013014-0ee6d361c5e4863503c8e8d250d055ef-3037452907
// CID
// 5055251177435748
// CST
// 95BP6n7vX48LpawsjDHNW96qgdK1ozsP


// CELSO 
// APP_USR-27b97b21-108f-4aa2-9476-ce27bd0bdc6a
// APP_USR-4015958212212223-013014-c5750e6b3527cb361f702e1a09f47011-3037580089
// 4015958212212223
// XV7WP1oTUmK8wc2tVKHpY8zs4iv6GufB