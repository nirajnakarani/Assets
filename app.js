require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const path = require("path");
const fs = require("fs");
const cron = require('node-cron');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const { createBullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

const port = process.env.PORT
const handleSocket = require("./socket/handleSocket");
const { pdfQueue, excelQueue, mailQueue } = require("./redis/queue");
const { uploadDir, importDir } = require("./constant/constant");
const showAuditAsset = require("./handler/assetAudit");
const expireAsset = require("./handler/expireAsset");
require("./config/DB")

app.use(express.static(path.join(__dirname, "./public")))
app.use("/uploads", express.static(uploadDir));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionMiddleware = session({
    secret: process.env.ASSETS_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Secure to true when using HTTPS
});
app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// for directory create
function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
ensureDirExists(uploadDir);
ensureDirExists(importDir);

app.use("/api/assets", require("./api/routes/assets"));

handleSocket(io)

// cron.schedule('* * * * *', () => {
//     console.log('running a task every minute');
// //     showAuditAsset()
//     expireAsset()
// });

// cron.schedule('0 8 * * *', () => {
//     console.log('running a task every minute');
//     showAuditAsset()
//     expireAsset()
// });


const serverAdapter = new ExpressAdapter();
const { router, } = createBullBoard({
    queues: [
        new BullMQAdapter(pdfQueue),
        new BullMQAdapter(excelQueue),
        new BullMQAdapter(mailQueue),
    ],
    serverAdapter,
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

server.listen(port, (err) => {
    err ? console.log(err) : console.log("Server running on port", port)
})
