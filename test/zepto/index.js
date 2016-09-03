'use strict';

/**
 * run this test in electron
 */

let ajaxproxy = require('../../index.js');

let assert = require('assert');

let {
    proxyAjax, recovery
} = ajaxproxy();

var xhr = function(path) {
    return new Promise((resolve) => {
        $.ajax({
            url: 'http://127.0.0.1:3000/' + path,
            headers: {
                a: 10,
                b: 2
            },
            success: (data) => {
                resolve(data);
            }
        });
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

test1().then(() => {
    console.log('[success]'); // eslint-disable-line
});
