module.exports = {
    apps: [
        {
            name: "webhook-trackpix-itau",
            script: "dist/webhook-server/webhook-server.js",
            env: {
                DEV: 0,
                PORT: 3010,
                PROD_CERT_PATH: "/certificates/cert.crt",
                LOG_LEVEL: "ITAU"
            },
            log_date_format: "DD/MM HH:mm"
        },
    ]
}
