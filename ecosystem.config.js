module.exports = {
    apps: [
        {
            name: "webhook-trackpix-itau",
            script: "dist/webhook-server/webhook-server.js",
            env: {
                DEV: 0,
                PORT: 3010,
                LOG_LEVEL: "ITAU_WEBHOOK"
            },
            log_date_format: "DD/MM HH:mm"
        },
        {
            name: "webhook-trackpix-efi",
            script: "dist/webhook-server/webhook-server.js",
            env: {
                DEV: 0,
                PORT: 3011,
                LOG_LEVEL: "EFI_WEBHOOK"
            },
            log_date_format: "DD/MM HH:mm"
        },
    ]
}
