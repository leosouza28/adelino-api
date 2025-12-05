import "express";
import { IUsuario } from "../../models/usuarios.model";

declare global {
    namespace Express {
        interface Request {
            connection_data?: {
                user_agent?: string;
                origin?: string;
                country?: string;
                city?: string;
                region?: string;
                latlng?: string;
                ip?: string;
                path?: string;
                method?: string;
                location?: {
                    latitude: string;
                    longitude: string;
                };
            };
            logado?: boolean;
            usuario?: IUsuario;
        }
    }

}
