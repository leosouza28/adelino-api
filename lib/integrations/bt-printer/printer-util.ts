import dayjs from "dayjs";

class Tabela {
    linhas: any[];

    constructor() {
        this.linhas = [];
    }
    addLinha() {
        this.linhas.push([]);
    }
    addColuna(tamanho: any = 10, alinha: any = 0) {
        this.linhas[this.linhas.length - 1].push({ tamanho, alinha, linhas: [] });
    }
    addTextoColuna(index: any, texto: any) {
        let coluna = this.linhas[this.linhas.length - 1][index];
        texto = String(texto);
        let linhas = (texto.length > coluna.tamanho ? Util.quebra_frase(texto, coluna.tamanho) : texto)
            .split("\n")
            .map(
                (v: any) => Util.alinha(v.trim(), coluna.tamanho, coluna.alinha)
            );
        coluna.linhas = [...coluna.linhas, ...linhas];
    }
    show() {
        let retorno: any[] = [];
        for (let linha of this.linhas) {
            let maiorIndex = 0;
            for (let coluna of linha) {
                if (coluna.linhas.length > maiorIndex) maiorIndex = coluna.linhas.length;
            }
            for (let i = 0; i < maiorIndex; i++) {
                let texto = "";
                for (let coluna of linha) {
                    let text = coluna.linhas[i];
                    if (!text) text = Util.geraCaracter(' ', coluna.tamanho);
                    texto += text;
                }
                retorno.push(texto);
            }
        }
        return retorno;
    }
}

export const Util = {
    Tabela: Tabela,
    isDev: () => false,
    toStartServerDate(date: any = new Date()) {
        return dayjs(date).startOf('day').add(3, 'h').toDate();
    },
    toEndServerDate(date: any = new Date()) {
        return dayjs(date).endOf('day').add(3, 'h').toDate();
    },

    dateStartOfDay(date: any = dayjs().format(), env: any = process.env['DEV']) {
        let fuso = env == 1 ? -3 : 0;
        let data = dayjs(date).startOf('day').add(fuso, 'hour').toDate();
        return data;
    },
    dateEndOfDay(date: any = dayjs().format(), env: any = process.env['DEV']) {
        let fuso = env == 1 ? -3 : 0;
        let data = dayjs(date).endOf('day').add(fuso, 'hour').toDate();
        return data;
    },
    now(date: any = dayjs().format(), env: any = process.env['DEV']) {
        let fuso = env ? -3 : 0;
        return dayjs(date).add(fuso, 'hour').toDate();
    },
    floatToMoney: (text: any) => {
        if (!text)
            return '0,00';
        let money = Util.moneyBr(Number(text).toFixed(2).split('.').join(''));
        if (Number(text) < 0) return `-${money}`;
        return money;
    },
    moneyBr: (text: any) => {
        if (!text)
            return '';
        let money = String(Number(Util.somenteNumero(text)));
        if (Number(money) > 9999999999999)
            money = "0";
        if (money.length < 3)
            money = Util.zeroEsquerda(3, money);
        money = money.replace(/([0-9]{2})$/g, ",$1");
        if (money.length > 6)
            money = money.replace(/([0-9]{3}),([0-9]{2}$)/g, ".$1,$2");
        return money;
    },
    zeroEsquerda: (zeros: any, text: any) => {
        text = text + '';
        let resp = '';
        let size = zeros - text.length;
        for (let i = 0; i < size; i++) {
            resp += '0';
        }
        resp += text;
        return resp;
    },
    quebra_frase(str: any, maxWidth: any) {
        str = String(str);
        let newLineStr = "\n";
        let done = false;
        let res = "";
        do {
            let found = false;
            for (let i = maxWidth - 1; i >= 0; i--) {
                if (this.testWhite(str.charAt(i))) {
                    res = res + [str.slice(0, i), newLineStr].join("");
                    str = str.slice(i + 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                res += [str.slice(0, maxWidth), newLineStr].join("");
                str = str.slice(maxWidth);
            }

            if (str.length < maxWidth) done = true;
        } while (!done);

        return res + str;
    },
    testWhite(x: any) {
        var white = new RegExp(/^\s$/);
        return white.test(x.charAt(0));
    },
    somenteNumero(text: any) {
        if (!text)
            return '';
        let numeros: any = [];
        '0123456789'.split('')
            .map((value: any) => numeros[value] = true);
        return String(text).split('')
            .filter(
                (value: any) => numeros[value]
            ).join('');
    },
    geraCaracter: (char: any = '', size: any = 0) => {
        let retorno = '';
        for (let i = 0; i < size; i++) {
            retorno += char;
        }
        return retorno;
    },
    alinha: (text: any = '', size: any = 0, position: any = 0) => {
        text = String(text);
        text = text.substr(0, size);
        switch (position) {
            case 0:
                return text + Util.geraCaracter(' ', size - text.length);
            case 1:
                let sobra = size - text.length;
                let isAdd = sobra % 2;
                sobra = Math.trunc(sobra / 2);
                return Util.geraCaracter(' ', sobra) + text + Util.geraCaracter(' ', sobra) + (isAdd ? ' ' : '');
            case 2:
                return Util.geraCaracter(' ', size - text.length) + text;
        }
    },
    milharToGrupo: (str: any) => {
        return Math.ceil((Number(String(str).substr(-2)) || 100) / 4);
    },
    combinacoesDez(array: any = [], size: any) {
        let result: any[] = [];
        let combination: any[] = [];
        let inner = (start: any, choose_: any, arr: any, n: any) => {
            if (choose_ == 0) {
                let temparray = [...combination];
                temparray.sort();
                result.push(temparray.join(";"));
            } else
                for (let i = start; i <= n - choose_; i++) {
                    combination.push(arr[i]);
                    inner(i + 1, choose_ - 1, arr, n);
                    combination.splice(combination.length - 1, 1);
                }
        };
        let dezenaCombinadas = (myArray: any = [], choose: any) => {
            let n = myArray.length;
            inner(0, choose, myArray, n);
            let array_final = [...result];
            result = [];
            combination = [];
            return array_final;
        };
        return dezenaCombinadas(array, size);
    },
    uniqueArray: (value: any, index: any, self: any) => {
        return self.indexOf(value) === index;
    },
    moneyBRL(value: any) {
        if (typeof value != 'number') return value;
        return value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).split("R$").join("");
    }
};
