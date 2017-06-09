'use strict';

let http = require('http');

let startServer = () => {
    let server = http.createServer((req, res) => {
        res.end(req.url);
    });
    return new Promise((resolve, reject) => {
        server.listen(3000, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(server);
            }
        });
    });
};

startServer();
