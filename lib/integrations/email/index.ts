import nodemailer from "nodemailer";
import compiler from "../handlebars/compiler";
import { MoneyBRL } from "../../util";

// IAM: api-estreladalva
// USERSMTP: AKIASZEIIUCL6RDIMK4V
// SENHASMTP: BBqTB9eizpxp1PRFkVJKY2FvRcRm96L7T+z6Y8h9yL1A

// const transporter = nodemailer.createTransport({
//     host: "email-smtp.us-east-1.amazonaws.com",
//     port: 465,
//     secure: true, // true para 465, false para outras portas
//     auth: {
//         user: "AKIASZEIIUCL6RDIMK4V",
//         pass: "BBqTB9eizpxp1PRFkVJKY2FvRcRm96L7T+z6Y8h9yL1A",
//     },
// });

const transporter = nodemailer.createTransport({
    host: "smtp.mailersend.net",
    port: 587,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: "MS_B0xo38@parqueestreladalva.com.br",
        pass: "mssp.7ehBTd6.vywj2lpykqml7oqz.oVLbRSB",
    },
});

export async function sendEmailConfirmacaoConta(nomeCliente: String, emailCliente: String, urlConfirmacao: String) {
    try {
        let html = compiler('account/mail-confirmacao-conta', {
            nomeCliente: nomeCliente,
            urlConfirmacao: urlConfirmacao,
        })
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: `${emailCliente}`,
            subject: "Confirmação de Conta - Parque Estrela Dalva",
            html
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de confirmação:", error);
    }
}

export async function sendEmailRecuperacaoAcesso(nomeCliente: String, emailCliente: String, urlRecuperacao: String) {
    try {
        let html = compiler('account/mail-recuperacao-senha', {
            nomeCliente: nomeCliente,
            urlRecuperacao: urlRecuperacao,
        })
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: `${emailCliente}`,
            subject: "Recuperar Acesso - Parque Estrela Dalva",
            html
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de recuperação de acesso:", error);
    }
}

export async function sendEmailCortesia(nomeCliente: String, codPedido: String, emailCliente: String, pdfBuffer: any) {
    try {
        let html = compiler('account/mail-cortesias-disponiveis', {
            nomeCliente: nomeCliente,
            urlSite: 'https://www.parqueestreladalva.com.br/ingressos'
        })
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: `${emailCliente}`,
            subject: `Voucher ${codPedido} - Parque Estrela Dalva`,
            html,
            attachments: [
                {
                    filename: `${codPedido}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                },
            ],
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de venda de ingressos:", error);
    }
}
export async function sendEmailVendaIngressos(nomeCliente: String, codPedido: String, emailCliente: String, valorPedido: any, pdfBuffer: any, vendaId: string) {
    try {
        let urlConvidados = process.env.DEV === "1" ?
            `http://localhost:4230/conta/pedidos/pedido?_id=${vendaId}` :
            `https://www.parqueestreladalva.com.br/conta/pedidos/pedido?_id=${vendaId}`;

        let html = compiler('account/mail-ingressos-disponiveis', {
            nomeCliente: nomeCliente,
            pedidoValor: MoneyBRL(valorPedido),
            urlConvidados
        })
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: `${emailCliente}`,
            subject: `Voucher ${codPedido} - Parque Estrela Dalva`,
            html,
            attachments: [
                {
                    filename: `${codPedido}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                },
            ],
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de venda de ingressos:", error);
    }
}

export async function sendEmailContatoCampanha(nomeCliente: String, emailCliente: String) {
    try {
        let html = compiler('capturas/mail-captura-recebida', {
            nomeCliente: nomeCliente,
        })
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: `${emailCliente}`,
            subject: `Contato recebido - Parque Estrela Dalva`,
            html,
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de contato:", error);
    }
}

export async function sendEmailNovaCapturaAdministradores(
    nomeCliente: String,
    emailCliente: String,
    telefoneCliente: String,
    cidadeCliente: String,
    planoCliente: String,
) {
    try {
        const info = await transporter.sendMail({
            from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
            to: ['lsouzaus@gmail.com'],
            subject: `Contato recebido - Parque Estrela Dalva`,
            text: `
                Uma nova captura foi recebida no site do Parque Estrela Dalva. Por favor, verifique o painel de administração para mais detalhes. \n
    
                Dados do cliente: \n
                Nome: ${nomeCliente} \n
                E-mail: ${emailCliente} \n
                Telefone: ${telefoneCliente} \n
                Cidade: ${cidadeCliente} \n
                Plano: ${planoCliente} \n
    
                Você pode acessar o painel de administração em: https://adm.parqueestreladalva.com.br/admin/capturas/listar \n
            `,
        });
        console.log("E-mail enviado: %s", info.messageId);
    } catch (error) {
        console.log("Erro ao enviar e-mail de nova captura para administradores:", error);
    }
}