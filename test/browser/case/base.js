'use strict';

let ajaxproxy = require('../../../');

let assert = require('assert');

let {
    proxyAjax
} = ajaxproxy(); // eslint-disable-line

proxyAjax({
    xhr: {
        proxyOptions: (options) => {
            options.url = '/api/b';
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

module.exports = xhr('api/a').then(res => {
    assert.deepEqual(JSON.parse(res), {
        b: 1
    });
});
