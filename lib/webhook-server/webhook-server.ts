import express from "express";
import http from "http";

const app = express();
const PORT = Number(process.env.PORT || 3010);
const LOG_LEVEL = process.env.LOG_LEVEL || "DEFAULT";

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
    console.log("Received request", req.method, req.originalUrl);
    next();
});

app.post("/pix", async (req, res) => {
    console.log(LOG_LEVEL, "POSTTED AT /pix");
    console.log(LOG_LEVEL, JSON.stringify(req.body, null, 2));
    res.status(200).end();
});

app.post("/", async (req, res) => {
    console.log(LOG_LEVEL, "POSTTED AT /");
    console.log(LOG_LEVEL, `SUCCESS_BODY: ${JSON.stringify(req.body, null, 2)}`);
    console.log(LOG_LEVEL, `SUCCESS_QUERY: ${JSON.stringify(req.query, null, 2)}`);
    res.status(200).end();
});

app.get("/", (req, res) => res.json("Online!"));

http.createServer(app).listen(PORT, "127.0.0.1", () => {
    console.log("App online (HTTP) at:", PORT);
});
