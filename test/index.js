'use strict';

/**
 * run this test in electron
 */

let ajaxproxy = require('../index.js');

let assert = require('assert');

let {
    proxyAjax, recovery
} = ajaxproxy();

var xhr = function(path) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', 'http://127.0.0.1:3000/' + path);

    xmlhttp.send();

    return new Promise((resolve) => {
        xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
                resolve(xmlhttp.responseText);
            }
        };
    });
};

let test1 = () => {
    proxyAjax();
    return xhr('hello').then(res => {
        assert.equal(res, '/hello');
    }).then(() => {
        recovery();
    });
};

let test2 = () => {
    proxyAjax({
        xhr: {
            beforeSend: (ctx) => {
                // change path
                ctx.open('GET', 'http://127.0.0.1:3000/newgood');
            }
        }
    });
    return xhr('good').then(res => {
        assert.equal(res, '/newgood');
    }).then(() => {
        recovery();
    });
};

test1().then(() => {
    return test2();
}).then(() => {
    console.log('[success]'); // eslint-disable-line
});
