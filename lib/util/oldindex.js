// import dayjs from "dayjs";
// import fs from 'fs';
// import hbsCompiler from "../integracoes/handlebars/hbs-compiler";
// export const SERVER = process.env.DEV == 1 && !!process.env?.IP ? `http://${process.env.IP}:8001` : 'https://api.guarapark.app';

// export function getImageBs64(fileName) {
//    let pathName = __dirname + `/../assets/images/${fileName}`;
//    let item = fs.readFileSync(pathName);
//    return Buffer.from(item).toString('base64');
// }

// export function limpaValor(val = "") {
//    if (!val) return null;
//    return val.split(".").join("")
//       .split("-").join("")
//       .split("/").join("")
//       .split("(").join("")
//       .split(")").join("")
//       .split(" ").join("")
//       .split("_").join("")
//       .trim()
// }

// export function dividirArray(array, tamanho) {
//    const resultado = [];
//    for (let i = 0; i < array.length; i += tamanho) {
//       const parte = array.slice(i, i + tamanho);
//       resultado.push(parte);
//    }
//    return resultado;
// }

// export function jsonToCsv(jsonData) {
//    // Verifica se o jsonData é um array
//    if (!Array.isArray(jsonData) || jsonData.length === 0) {
//       return "";
//    }

//    // Extrai as chaves do primeiro objeto para os cabeçalhos
//    const headers = Object.keys(jsonData[0]);

//    // Mapeia os dados para o formato CSV
//    const csvRows = [
//       headers.join(','), // Cabeçalhos
//       ...jsonData.map(row => headers.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')) // Linhas
//    ].join('\n');

//    return csvRows;

//    // Função auxiliar para lidar com aspas nos dados
//    function replacer(key, value) {
//       return value === null ? '' : value; // Substitui valores nulos por uma string vazia
//    }
// }


// function escapeCSV(value) {
//    if (typeof value === 'string') {
//       // Escape double quotes
//       value = value.replace(/"/g, '""');
//       // If value contains comma, newline, or double quotes, wrap it in double quotes
//       if (value.includes(',') || value.includes('\n') || value.includes('"')) {
//          value = `"${value}"`;
//       }
//    }
//    return value;
// }

// export function jsonToCSV2(data) {
//    const results = [];
//    const headersSet = new Set();

//    function recurse(object, parentKey = '') {
//       if (typeof object === 'object' && object !== null) {
//          if (Array.isArray(object)) {
//             object.forEach((item, index) => {
//                recurse(item, `${parentKey}${parentKey ? '_' : ''}${index}`);
//             });
//          } else {
//             Object.entries(object).forEach(([key, value]) => {
//                recurse(value, `${parentKey}${parentKey ? '_' : ''}${key}`);
//             });
//          }
//       } else {
//          results.push({ key: parentKey, value: object !== undefined ? object : '' });
//          headersSet.add(parentKey);
//       }
//    }

//    // Recurse through each JSON object in the array
//    data.forEach(item => recurse(item));

//    // Convert to CSV
//    const headers = Array.from(headersSet);
//    const rows = results.reduce((acc, { key, value }) => {
//       if (!acc[key]) acc[key] = [];
//       acc[key].push(value);
//       return acc;
//    }, {});

//    const maxRows = Math.max(...Object.values(rows).map(arr => arr.length));
//    const csvArray = [headers.map(escapeCSV).join(',')];

//    for (let i = 0; i < maxRows; i++) {
//       const row = headers.map(header => escapeCSV(rows[header][i] !== undefined ? rows[header][i] : ''));
//       csvArray.push(row.join(','));
//    }

//    return csvArray.join('\n');
// }

// export function removerAcentos(texto) {
//    return texto
//       .normalize('NFD') // Normaliza o texto
//       .replace(/[\u0300-\u036f]/g, ''); // Remove os acentos
// }

// export const arrayCpfsInvalidos = [
//    "11111111111",
//    "22222222222",
//    "33333333333",
//    "44444444444",
//    "55555555555",
//    "66666666666",
//    "77777777777",
//    "88888888888",
//    "99999999999",
//    "00000000000",
// ]
// export function logDev(...args) {
//    if (process.env.DEV == 1) console.log(...args);
// }

// export function errorHandler(error, res, htmlRes = false) {
//    console.log("ERROR", error);
//    let err = "Falha na comunicação com servidor!";
//    if (error?.message) err = error.message;
//    if (err == 'Não autorizado') {
//       res.status(401)
//       res.json({ message: err })
//       return;
//    }
//    if (htmlRes) {
//       let html = hbsCompiler('../views/404', { imgBs64: getImageBs64('guara-logo-name-nobg.png') });
//       res.status(400);
//       res.send(html);
//    } else {
//       res.status(400);
//       res.json({ message: err });
//    }
//    return;
// }

// export const delayTimer = (timer = 1000) => new Promise(resolve => setTimeout(resolve, timer))

// export function numberToMoney(value = 0) {
//    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// export function MoneyBRL(value) {
//    if (typeof value != 'number') return value;
//    return value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).split("R$").join("");
// }

// export function stringToMoney(str = '0,00') {
//    if (typeof str == 'number') return str;
//    return Number(str.split(",").join("."));
// }

// export function calcularEncargos(valor, diasAtraso, multa = 0.02, jurosMensal = 0.01) {
//    let valorMulta = valor * multa
//    let jurosCalculados = jurosMensal * valor * (diasAtraso / 30) // Ajustando o atraso para meses
//    let valorTotal = valor + valorMulta + jurosCalculados
//    return {
//       valor,
//       encargos: valorMulta + jurosCalculados,
//       diasAtraso,
//       total: valorTotal,
//    }
// }

// export async function isValidEmail(email) {
//    try {
//       const re = /\S+@\S+\.\S+/;
//       let test = re.test(email);
//       if (!test) throw new Error("E-mail inválido!");
//       return test;
//    } catch (error) {
//       throw error;
//    }
// }

// export async function isValidTelefone(tel = "00000000000") {
//    try {
//       if (
//          tel == "00000000000" ||
//          tel == "11111111111" ||
//          tel == "22222222222" ||
//          tel == "33333333333" ||
//          tel == "44444444444" ||
//          tel == "55555555555" ||
//          tel == "66666666666" ||
//          tel == "77777777777" ||
//          tel == "88888888888" ||
//          tel == "99999999999" ||
//          tel == "12345678901" ||
//          tel == "01010101010" ||
//          tel == "10101010101"
//       ) throw new Error("Telefone inválido!")
//       if (!tel) throw new Error("Telefone inválido!");
//       if (tel.length < 10) throw new Error("Telefone inválido!");
//       return true;
//    } catch (error) {
//       return false;
//    }

// }

// export async function isValidCPF(strCPF) {
//    try {
//       let Soma;
//       let Resto;
//       Soma = 0;
//       if (strCPF == "00000000000") throw new Error("CPF inválido!");

//       for (let i = 1; i <= 9; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
//       Resto = (Soma * 10) % 11;

//       if ((Resto == 10) || (Resto == 11)) Resto = 0;
//       if (Resto != parseInt(strCPF.substring(9, 10))) throw new Error("CPF inválido!");

//       Soma = 0;
//       for (let i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
//       Resto = (Soma * 10) % 11;

//       if ((Resto == 10) || (Resto == 11)) Resto = 0;
//       if (Resto != parseInt(strCPF.substring(10, 11))) throw new Error("CPF inválido!");

//       return true;
//    } catch (error) {
//       throw error;
//    }
// }

// export function getMeses() {
//    return [
//       { mes: 0, label: "JANEIRO" },
//       { mes: 1, label: "FEVEREIRO" },
//       { mes: 2, label: "MARÇO" },
//       { mes: 3, label: "ABRIL" },
//       { mes: 4, label: "MAIO" },
//       { mes: 5, label: "JUNHO" },
//       { mes: 6, label: "JULHO" },
//       { mes: 7, label: "AGOSTO" },
//       { mes: 8, label: "SETEMBRO" },
//       { mes: 9, label: "OUTUBRO" },
//       { mes: 10, label: "NOVEMBRO" },
//       { mes: 11, label: "DEZEMBRO" },
//    ]
// }
// export function mascaraCPFCNPJ(valor) {
//    if (Number.isNaN(Number(valor)) == true) return valor;
//    valor = valor.replace(/\D/g, ""); // remove todos os caracteres não numéricos
//    if (valor.length <= 11) { // se for CPF
//       valor = valor.replace(/(\d{3})(\d)/, "$1.$2"); // adiciona o primeiro ponto após os primeiros 3 dígitos
//       valor = valor.replace(/(\d{3})(\d)/, "$1.$2"); // adiciona o segundo ponto após os próximos 3 dígitos
//       valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // adiciona o hífen e os últimos 2 dígitos
//    } else { // se for CNPJ
//       valor = valor.replace(/^(\d{2})(\d)/, "$1.$2"); // adiciona o primeiro ponto após os primeiros 2 dígitos
//       valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); // adiciona o segundo ponto após os próximos 3 dígitos
//       valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2"); // adiciona a barra e os próximos 3 dígitos
//       valor = valor.replace(/(\d{4})(\d)/, "$1-$2"); // adiciona o hífen e os últimos 2 dígitos
//    }
//    return valor;
// }
// export function mascaraTelefone(valor) {
//    if (Number.isNaN(Number(valor)) == true) return valor;
//    valor = valor.replace(/\D/g, ""); // remove todos os caracteres não numéricos
//    if (valor.length <= 11) { // se for CPF
//       valor = valor.replace(/(\d{3})(\d)/, "$1.$2"); // adiciona o primeiro ponto após os primeiros 3 dígitos
//       valor = valor.replace(/(\d{3})(\d)/, "$1.$2"); // adiciona o segundo ponto após os próximos 3 dígitos
//       valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // adiciona o hífen e os últimos 2 dígitos
//    } else { // se for CNPJ
//       valor = valor.replace(/^(\d{2})(\d)/, "$1.$2"); // adiciona o primeiro ponto após os primeiros 2 dígitos
//       valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); // adiciona o segundo ponto após os próximos 3 dígitos
//       valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2"); // adiciona a barra e os próximos 3 dígitos
//       valor = valor.replace(/(\d{4})(\d)/, "$1-$2"); // adiciona o hífen e os últimos 2 dígitos
//    }
//    return valor;
// }

// export function mascaraTelefoneCoringa(telefone) {
//    if (telefone.length > 8) telefone = limpaValor(telefone);
//    if (telefone.length === 10) { // telefone fixo com DDD
//       return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
//    } else if (telefone.length === 11) { // celular com DDD
//       return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
//    } else {
//       return telefone; // não é um telefone válido
//    }
// }

// export function toUpper(str) {
//    if (typeof str == 'string') return str.toUpperCase();
//    return str;
// }

// export function dataSimpleBR(data, fuso = 3, mask = "DD/MM/YYYY") {
//    if (data == null) return '---';
//    return dayjs(data).add(fuso, 'h').format(mask)
// }

// export function limpaEmail(str = '') {
//    return str.split(",").join("");
// }