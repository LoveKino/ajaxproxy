'use strict';

let browserJsEnv = require('browser-js-env');
let promisify = require('es6-promisify');
let fs = require('fs');
let path = require('path');
let readFile = promisify(fs.readFile);

let runFileInBrowser = (file) => {
    return readFile(file).then((str) => {
        return browserJsEnv(str, {
            testDir: path.join(path.dirname(file), `../../__test/${path.basename(file)}`),
            clean: true,
            apiMap: {
                '/api/a': (req, res) => {
                    res.end(JSON.stringify({
                        a: 1
                    }));
                },

                '/api/b': (req, res) => {
                    res.end(JSON.stringify({
                        b: 1
                    }));
                },

                '/api/c': (req, res) => {
                    res.end(JSON.stringify({
                        headers: req.headers
                    }));
                }
            }
        });
    });
};

let testFiles = {
    'base': path.join(__dirname, '../browser/case/base.js'),
    'proxyOptions': path.join(__dirname, '../browser/case/proxyOptions.js')
};

describe('browser', () => {
    for (let name in testFiles) {
        it(name, () => {
            return runFileInBrowser(testFiles[name]);
        });
    }
});
