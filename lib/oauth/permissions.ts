interface ScopeKeys {
    [key: string]: string;
}

export interface Scope {
    key: string;
    description: string;
}

const scopes = {
    "pagina_inicial.dashboard_admin_geral": "Pagina inicial do dashboard (admin geral)",

    "usuarios.leitura": "Ler usuários",
    "usuarios.editar": "Editar usuários",

    "monitoramento.pix_leitura": "Permite acessar o monitoramento de PIX",
}

function getAllAvailableScopes(): Scope[] {
    return Object.keys(scopes).map((key) => {
        return {
            key: key,
            // @ts-ignore
            description: scopes[key]
        }
    })
}

function isScopeAuthorized(scope: string, userScopes: string[]): boolean {
    if (userScopes.includes('*')) {
        return true;
    }
    return userScopes.includes(scope);
}

export {
    scopes,
    isScopeAuthorized,
    getAllAvailableScopes
};