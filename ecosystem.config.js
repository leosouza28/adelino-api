module.exports = {
    apps: [
        {
            name: "webhook-trackpix-efi",
            script: "dist/webhook-server/webhook-server.js",
            env: {
                DEV: 0,
                PORT: 3010,
                CERT_CA: "/certificates/efi/cert.crt",
                LOG_LEVEL: "EFI_WEBHOOK"
            },
            log_date_format: "DD/MM HH:mm"
        }
    ]
}