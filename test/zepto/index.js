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

// mock
let test2 = () => {
    proxyAjax({
        xhr: {
            proxySend: () => {
                return {
                    status: 200,
                    statusText: 'OK',
                    bodyType: '',
                    body: '12345'
                };
            }
        }
    });

    return xhr('hello').then(res => {
        assert.equal(res, '12345');
    }).then(() => {
        recovery();
    });
};

test1().then(() => {
    return test2();
}).then(() => {
    console.log('[success]'); // eslint-disable-line
});
