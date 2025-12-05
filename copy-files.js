const { globSync } = require('glob');
const mainFs = require('fs');

async function start() {
    let interestFiles = globSync('**/*.{pem,p12,json,html,ico,pug,png,jpeg,ttf,jpg,cer,crt,key,hbs}', { dot: true, ignore: ['node_modules/**', 'dist/**', 'data/**'] })
    if (interestFiles.length) {
        for (let i of interestFiles) {
            if (i == 'package.json' || i == 'package-lock.json' || i == 'source-context.json' || i == 'yarn.lock' || i == 'tsconfig.json') continue;
            let cpDir = i.split("lib").join("dist");
            mainFs.cpSync(i, cpDir);
        }
    }
}
start();