import { Response } from 'express';
import fs from 'fs';
import path from 'path';

function mascaraTelefone(value: string): string {
    const cleanedValue = value.replace(/\D/g, ''); // Remove non-numeric characters
    if (cleanedValue.length === 11) {
        return cleanedValue.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (cleanedValue.length === 10) {
        return cleanedValue.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
        return value;
    }
}

function mascaraCPFouCNPJ(value: string): string {
    const isValidCNPJ = (cnpj: string) => {
        if (!cnpj || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        let digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        for (let i = size; i >= 1; i--) {
            sum += parseInt(numbers.charAt(size - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(0))) return false;
        size++;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        for (let i = size; i >= 1; i--) {
            sum += parseInt(numbers.charAt(size - i)) * pos--;
            if (pos < 2) pos = 9;
        }
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        return result === parseInt(digits.charAt(1));
    };

    if (value.length == 11) {
        return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (isValidCNPJ(value)) {
        return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    } else {
        return value;
    }
}

function getImageByFilenameOutBs64(fileName: string, seco = false) {
    const filename = path.join(__dirname, '../assets/imgs/', fileName);
    if (fs.existsSync(filename)) {
        const fileBuffer = fs.readFileSync(filename);
        const base64Image = Buffer.from(fileBuffer).toString('base64');
        let base64String = "";
        if (seco) {
            base64String = `${base64Image}`;
        } else {
            base64String = `data:image/png;base64,${base64Image}`;
        }
        return base64String;
    } else {
        console.error(`File not found: ${filename}`);
        return null;
    }
}

function getPackageVersion() {
    let version = '0.0.0';
    let packageJsonPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        version = packageJson.version || '0.0.0';
    }
    return version;
}
function logDev(...args: any) {
    if (process.env.DEV === "1") {
        if (args.length == 1) {
            if (typeof args[0] == 'object') {
                console.log(JSON.stringify(args[0], null, 2))
                return
            }else{
                console.log(args[0])
                return
            }
        } else {
            console.log(...args)
        }
    }
}

function errorHandler(error: any, res: Response) {
    console.error("ERROR", error);
    let err = "Falha na comunicação com servidor!";
    if (error?.message) err = error.message;
    if (error?.message == 'Token expired') err = 'Não autorizado';
    if (err == 'Não autorizado') {
        res.status(401)
        res.json({ message: err })
    } else {
        res.status(400);
        res.json({ message: err });
    }
}

function limpaValor(val = "") {
    if (!val) return null;
    return val.split(".").join("")
        .split("-").join("")
        .split("/").join("")
        .split("(").join("")
        .split(")").join("")
        .split(" ").join("")
        .split("_").join("")
        .trim()
}

function dividirArray(array: any[], tamanho: number) {
    const resultado = [];
    for (let i = 0; i < array.length; i += tamanho) {
        const parte = array.slice(i, i + tamanho);
        resultado.push(parte);
    }
    return resultado;
}

function isValidCPF(strCPF = '') {
    try {
        let Soma;
        let Resto;
        Soma = 0;
        if (strCPF == "00000000000") throw new Error("CPF inválido!");
        if (strCPF.length != 11) throw new Error("CPF inválido!");

        for (let i = 1; i <= 9; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
        Resto = (Soma * 10) % 11;

        if ((Resto == 10) || (Resto == 11)) Resto = 0;
        if (Resto != parseInt(strCPF.substring(9, 10))) throw new Error("CPF inválido!");

        Soma = 0;
        for (let i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
        Resto = (Soma * 10) % 11;

        if ((Resto == 10) || (Resto == 11)) Resto = 0;
        if (Resto != parseInt(strCPF.substring(10, 11))) throw new Error("CPF inválido!");

        return true;
    } catch (error) {
        throw error;
    }
}

async function isValidEmail(email = '') {
    try {
        const re = /\S+@\S+\.\S+/;
        let test = re.test(email);
        if (!test) throw new Error("E-mail inválido!");
        return test;
    } catch (error) {
        throw error;
    }
}

async function isValidTelefone(tel = "00000000000") {
    try {
        if (
            tel == "00000000000" ||
            tel == "11111111111" ||
            tel == "22222222222" ||
            tel == "33333333333" ||
            tel == "44444444444" ||
            tel == "55555555555" ||
            tel == "66666666666" ||
            tel == "77777777777" ||
            tel == "88888888888" ||
            tel == "99999999999" ||
            tel == "12345678901" ||
            tel == "01010101010" ||
            tel == "10101010101"
        ) throw new Error("Telefone inválido!")
        if (!tel) throw new Error("Telefone inválido!");
        if (tel.length < 10) throw new Error("Telefone inválido!");
        return true;
    } catch (error) {
        return false;
    }
}

const delayTimer = (timer = 1000) => new Promise(resolve => setTimeout(resolve, timer))

function MoneyBRL(value: any) {
    if (typeof value != 'number') return value;
    return value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).split("R$").join("");
}

function removerAcentos(texto: any) {
    return texto
        .normalize('NFD') // Normaliza o texto
        .replace(/[\u0300-\u036f]/g, ''); // Remove os acentos
}

export {
    delayTimer, dividirArray, errorHandler,
    removerAcentos,
    getImageByFilenameOutBs64, getPackageVersion, isValidCPF,
    isValidEmail,
    isValidTelefone, limpaValor, logDev, MoneyBRL,
    mascaraCPFouCNPJ,
    mascaraTelefone,
};
