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
    "usuarios.perfis_acesso_leitura": "Ler perfis de acesso de usuários",
    "usuarios.perfis_acesso_editar": "Editar perfis de acesso de usuários",

    "pix.leitura": "Ler pix gerados pelo sistema",
    "pix.editar": "Gerar pix pelo sistema",

    "lojas.leitura": "Permite acessar a lista de lojas",
    "lojas.editar": "Permite editar a lista de lojas",

    "monitoramento.pix_leitura": "Permite acessar o monitoramento de PIX",

    "relatorio.pix_recebidos": "Permite acessar o relatório de pix recebidos",

    "notificacao.pix_recebido": "Habilita notificações de PIX recebidos",

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