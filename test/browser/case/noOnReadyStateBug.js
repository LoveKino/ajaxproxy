'use strict';

let ajaxproxy = require('../../../');

let {
    delay
} = require('jsenhance');

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

let flag = false;

proxyAjax({
    xhr: {
        proxyResponse: (response) => {
            assert.equal(response.body, 'no ready');

            flag = true;
            return response;
        }
    }
});

var xmlhttp = new XMLHttpRequest();
xmlhttp.open('GET', '/api/noOnReadyStateBug');
xmlhttp.setRequestHeader('Accept', 'text');
xmlhttp.send();

module.exports = delay(2000).then(() => {
    assert(flag);
});
