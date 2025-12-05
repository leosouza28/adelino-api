import { Request, Response, NextFunction } from 'express';
import { errorHandler, logDev } from '../util';
import { NAO_AUTORIZADO } from '../oauth';
import { scopes } from '../oauth/permissions';


export default (permission: keyof typeof scopes) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // @ts-ignore
        const user = req.usuario; // precisa garantir que o user já está autenticado

        if (user?.scopes?.includes("*")) {
            logDev("Permissão total");
        } else {
            // console.log("Permissão parcial");
            // console.log(user?.scopes);
        }

        // console.log(user, permission);

        // if (!user || !hasPermission(user, permission)) {
        //     return errorHandler(NAO_AUTORIZADO, res);
        // }
        next();
    };
}
