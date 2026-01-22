import mongoose from "mongoose";

interface IUsuarioTelefone {
    tipo: string;
    valor: string;
    principal?: boolean
}

interface IUsuarioEndereco {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
}

export interface IUsuario {
    _id?: string;
    documento?: string;
    doc_type?: string;
    nome?: string;
    email?: string;
    senha?: string;
    data_nascimento?: Date | null;
    email_confirmacao_token?: string;
    sexo?: string;
    status?: string;
    origem_cadastro?: string;
    niveis?: string[];
    telefone_principal?: IUsuarioTelefone | null;
    telefones?: IUsuarioTelefone[];
    endereco?: IUsuarioEndereco;
    scopes?: string[];
    empresas?: {
        _id: string;
        nome: string;
        perfil: {
            _id: string;
            scopes: string[];
        };
    }[];
    criado_por?: {
        data_hora: Date;
        usuario: IUsuario;
    };
    atualizado_por?: {
        data_hora: Date;
        usuario: IUsuario;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

const ModelSchema = new mongoose.Schema({
    foto_url: String,
    documento: String,
    username: String,
    doc_type: {
        type: String,
        default: 'cpf'
    },
    nome: String,
    email: String,
    email_confirmado: {
        type: Boolean,
        default: false
    },
    email_confirmacao_token: String,
    email_last_send: Date,
    senha: String,
    senha_recuperacao_token: String,
    senha_recuperacao_token_expira: Date,
    data_nascimento: Date,
    sexo: String,
    status: String,
    niveis: [String],
    // scopes: [String],
    origem_cadastro: String,
    usuario_ultima_troca_senha: Date,
    telefone_principal: {
        tipo: String,
        valor: String
    },
    telefones: [
        {
            tipo: String,
            valor: String,
            principal: Boolean
        }
    ],
    endereco: {
        cep: String,
        logradouro: String,
        numero: String,
        complemento: String,
        bairro: String,
        cidade: String,
        estado: String
    },

    tokens: [String],

    ultimo_acesso: Date,
    ultimo_ip: String,
    ultimo_user_agent: String,

    empresas: [
        {
            _id: String,
            nome: String,
            perfil: {
                _id: String,
                nome: String,
                scopes: [String]
            },
            controle_acesso: {
                ativado: Boolean,
                horarios: [
                    {
                        dia: Number,
                        label: String,
                        ativado: Boolean,
                        hora_inicio: String,
                        hora_fim: String
                    }
                ]
            },
            limitar_dias_consulta: Boolean,
            max_dias_passados: Number,
            ativo: Boolean
        }
    ],

    criado_por: {
        data_hora: Date,
        usuario: {
            _id: String,
            nome: String,
            username: String,
            documento: String,
        }
    },
    atualizado_por: {
        data_hora: Date,
        usuario: {
            _id: String,
            nome: String,
            username: String,
            documento: String,
        }
    }
}, {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt"
    }
});

export const UsuariosModel = mongoose.model("usuarios", ModelSchema);

export const USUARIO_DOC_TYPE = {
    CPF: "CPF",
    PASSAPORTE: "PASSAPORTE"
}
export const USUARIO_SEXO = {
    MASCULINO: "MASCULINO",
    FEMININO: "FEMININO",
    NAO_INFORMAR: "NAO_INFORMAR"
}

export const USUARIO_NIVEL = {
    ADMIN: "ADMIN",
    VENDEDOR: "VENDEDOR",
    CLIENTE: "CLIENTE",
    SUPERVISOR_VENDAS: "SUPERVISOR VENDAS",
}
export const USUARIO_MODEL_STATUS = {
    ATIVO: "ATIVO",
    BLOQUEADO: "BLOQUEADO",
}
export const USUARIO_MODEL_ADMIN_STATUS = {
    ATIVO: "ATIVO",
    BLOQUEADO: "BLOQUEADO",
}

export const USUARIO_MODEL_TIPO_TELEFONE = {
    CEL_WHATSAPP: "CEL_WHATSAPP",
    WHATSAPP: "WHATSAPP",
    CELULAR: "CELULAR",
    FIXO: "FIXO"
}
export const USUARIO_ORIGEM_CADASTRO = {
    CEL_WHATSAPP: "SITE",
    APP: "APP",
    PDV_PLANOS: "PDV PLANOS",
}

export const USUARIO_DEFAULT_VALUES_INPUT = {
    _id: String,
    nome: String,
    email: String,
    sexo: String,
    doc_type: String,
    data_nascimento: Date,
    documento: String,
    telefone_principal: {
        tipo: String,
        valor: String
    },
    telefones: [
        {
            tipo: String,
            valor: String,
            principal: Boolean
        }
    ],
    endereco: {
        cep: String,
        logradouro: String,
        numero: String,
        complemento: String,
        bairro: String,
        cidade: String,
        estado: String
    }
}
