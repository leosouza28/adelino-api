module.exports = {
    apps: [
        {
            name: "webhook-trackpix",
            script: "dist/webhook-server/webhook-server.js",
            env: { DEV: 0 },
            log_date_format: "DD/MM HH:mm"
        }
    ]
}