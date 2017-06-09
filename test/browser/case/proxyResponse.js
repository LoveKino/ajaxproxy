'use strict';

let ajaxproxy = require('../../../');

let assert = require('assert');

let {
    proxyAjax
} = ajaxproxy(); // eslint-disable-line

proxyAjax({
    xhr: {
        proxyResponse: (res) => {
            assert.equal(res.body, 'server response');
            res.body = 'tamper';
            return res;
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

module.exports = xhr('api/proxyResponse').then(res => {
    assert.deepEqual(res, 'tamper');
});
