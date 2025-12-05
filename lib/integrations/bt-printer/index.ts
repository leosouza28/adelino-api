import dayjs from 'dayjs';
import { Util } from './printer-util';
import { MoneyBRL, removerAcentos } from '../../util';

interface PrintObject {
    tipo: string;
    data?: string;
    linhas?: number;
    negrito?: boolean;
    invertido?: boolean;
    fontGrande?: boolean;
    texto?: string;
    cod?: string;
    size?: number;
}

class Impressora {

    retorno: PrintObject[];
    negrito: boolean;
    invertido: boolean;
    fontGrande: boolean;

    constructor() {
        this.retorno = [];
        this.negrito = false;
        this.invertido = false;
        this.fontGrande = false;
    }

    fonteGrande() {
        this.fontGrande = true;
    }

    texto_longo(text: string, size: number, align: number) {
        Util.quebra_frase(text, 32).split('\n').forEach((value: any) => {
            if (value.length) this.text(Util.alinha(value, size, align) || '');
        });
    }

    fontePequena() {
        this.fontGrande = false;
        // Logic for font size based on city can be added here
    }

    reset() {
        this.negrito = false;
        this.invertido = false;
        this.fontGrande = false;
    }

    printImage(data64: string) {
        const obj: PrintObject = {
            data: data64,
            tipo: "image",
        };
        this.retorno.push(obj);
    }

    fundoPreto(on = true) {
        this.invertido = on;
    }

    linha(lines = 1) {
        const obj: PrintObject = {
            linhas: lines,
            negrito: this.negrito,
            invertido: this.invertido,
            fontGrande: this.fontGrande,
            tipo: "linha",
        };
        this.retorno.push(obj);
    }

    printQR(cod: string) {
        const obj: PrintObject = { texto: cod, tipo: "qrcode", };
        this.retorno.push(obj);
    }

    text(v: string) {
        const obj: PrintObject = {
            texto: v,
            negrito: this.negrito,
            invertido: this.invertido,
            fontGrande: this.fontGrande,
            tipo: "",
        };
        this.retorno.push(obj);
    }

    getBuffer(): PrintObject[] {
        return this.retorno;
    }

    printVoucherVendaPortaria(data: any) {
        const size = 32;
        const _linha = Util.geraCaracter("-", size);

        // The commented-out logic can be implemented here as needed
        this.linha();
        this.linha();

        this.text(Util.alinha('Estrela Dalva', size, 1) || '')
        this.text(Util.alinha(`Pedido ${data.codigo}`, size, 1) || '')
        this.text(Util.alinha(`Operador: ${data.criado_por.usuario.nome}`, size, 0) || '')
        this.text(Util.alinha(`Data: ${dayjs(data.createdAt).add(-3, 'h').format('DD/MM/YY HH:mm:ss')}`, size, 0) || '')
        this.text(Util.alinha(`Ingressos: ${data.qtd_items}`, size, 0) || '')

        this.linha();


        for (let [key, item] of data.items.entries()) {
            this.linha();
            this.linha();
            this.text(Util.alinha(`Bilhete ${key + 1}`, size, 1) || '')
            this.linha();
            this.text(Util.alinha(item.nome, size, 1) || '')
            this.linha();
            this.text(Util.alinha(`${item.valor_liquido.toFixed(2)}`, size, 1) || '')
            this.printQR(item.hash)
            this.text(_linha)
        }

        this.linha();
        this.linha();


        let info = [
            'Apresente seus ingressos',
            'na portaria do parque',
            'para validacao.'
        ]

        for (let i of info) {
            this.text(Util.alinha(i, size, 1) || '')
        }
        this.linha();
        this.linha();

        this.text(_linha);

        this.linha();
        this.linha();


        return this.getBuffer();
    }
}

export default Impressora;
