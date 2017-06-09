'use strict';

let ajaxproxy = require('../../../');

let assert = require('assert');

let {
    proxyAjax
} = ajaxproxy(); // eslint-disable-line

proxyAjax({
    xhr: {
        proxyOptions: (options) => {
            options.headers = {
                Accept: 'blabla',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Ok': 'sure'
            };
            return options;
        }
    }
});

var xhr = function(path) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', path);

    xmlhttp.setRequestHeader('Accept', 'text');

    xmlhttp.send();

    return new Promise((resolve) => {
        xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
                resolve(xmlhttp.responseText);
            }
        };
    });
};

module.exports = xhr('api/c').then(res => {
    let headers = JSON.parse(res).headers;
    assert.deepEqual(headers.ok, 'sure');
    assert.deepEqual(headers.accept, 'blabla');
});
