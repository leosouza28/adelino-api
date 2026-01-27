module.exports = {
    apps: [
        {
            name: "cron-tp",
            script: "dist/webhook-server/cron-server.js",
            env: {
                PORT: 8005,
                DEV: 0,
                CRON_ON: 1
            },
            log_date_format: "DD/MM HH:mm:ss"
        }
        // {
        //     name: "webhook-trackpix",
        //     script: "dist/webhook-server/webhook-server.js",
        //     env: { DEV: 0 },
        //     log_date_format: "DD/MM HH:mm"
        // }
    ]
}