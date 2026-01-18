import nodemailer from "nodemailer";
import compiler from "../handlebars/compiler";
import { MoneyBRL } from "../../util";

// const transporter = nodemailer.createTransport({
//     host: "",
//     port: 587,
//     secure: false, // true para 465, false para outras portas
//     auth: {
//         user: ""
//         pass: ""
//     },
// });

// export async function sendEmailTest(nomeCliente: String, emailCliente: String, urlConfirmacao: String) {
//     try {
//         let html = compiler('account/mail-confirmacao-conta', {
//             nomeCliente: nomeCliente,
//             urlConfirmacao: urlConfirmacao,
//         })
//         const info = await transporter.sendMail({
//             from: '"Atendimento Estrela Dalva" <atendimento@parqueestreladalva.com.br>',
//             to: `${emailCliente}`,
//             subject: "Confirmação de Conta - Parque Estrela Dalva",
//             html
//         });
//         console.log("E-mail enviado: %s", info.messageId);
//     } catch (error) {
//         console.log("Erro ao enviar e-mail de confirmação:", error);
//     }
// }
