require('dotenv').config();
const Sentry = require('./libs/sentry');
const express = require('express');
const app = express();
const logger = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');


const server = http.createServer(app);
var io = new Server(server);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));

app.use(logger('dev'));
app.use(express.json());

const routes = require('./routes');
app.use('/', routes);

Sentry.setupExpressErrorHandler(app);

// 500 error handler
app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        status: false,
        message: err.message,
        data: null
    });
});

// 404 error handler
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        message: `are you lost? ${req.method} ${req.url} is not registered!`,
        data: null
    });
});

module.exports = app;
