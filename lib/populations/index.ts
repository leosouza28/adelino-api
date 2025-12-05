import axios from 'axios';
import bcrypt from 'bcrypt';
import { MunicipiosModel } from '../models/municipios.model';
import { USUARIO_MODEL_STATUS, USUARIO_NIVEL, UsuariosModel } from '../models/usuarios.model';
import { logDev } from '../util';


export async function startDB() {
    try {
        logDev("Starting DB population...");
        await setAdmin();
        await getSetMunicipios();
    } catch (error) {
        console.log(error);
    }
}


async function setAdmin() {
    logDev("Create super")
    await UsuariosModel.updateOne(
        { documento: "02581748206" },
        {
            $set: {
                nome: "Administrador",
                email: "lsouzaus@gmail.com",
                username: "admin",
                scopes: ["*"],
                niveis: [USUARIO_NIVEL.ADMIN, USUARIO_NIVEL.CLIENTE, USUARIO_NIVEL.VENDEDOR],
                senha: bcrypt.hashSync("leo1010", 10),
                status: USUARIO_MODEL_STATUS.ATIVO
            }
        },
        { upsert: true }
    )
    logDev("End super")
}

async function getSetMunicipios() {
    try {
        logDev("Fetching...")
        let response1 = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');

        let bulks: any[] = []
        for (let item of response1.data) {
            let response2 = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${item.sigla}/municipios`);
            for (let municipio of response2.data) {
                let filter = {
                    id: municipio.id,
                    "estado.id": item.id
                }
                bulks.push({
                    updateOne: {
                        filter,
                        update: {
                            $set: {
                                id: municipio.id,
                                nome: municipio.nome,
                                estado: {
                                    id: item.id,
                                    nome: item.nome,
                                    sigla: item.sigla,
                                }
                            }
                        },
                        upsert: true
                    }
                })
            }
        }
        let bulk_response = await MunicipiosModel.bulkWrite(bulks);
        logDev("Done!", bulk_response);
    } catch (error) {
        logDev("Error", error);

    }

}

