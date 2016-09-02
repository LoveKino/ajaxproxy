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
            proxyOptions: (options) => {
                options.url = 'http://127.0.0.1:3000/newgood';
                return options;
            }
        }
    });
    return xhr('good').then(res => {
        assert.equal(res, '/newgood');
    }).then(() => {
        recovery();
    });
};

let test3 = () => {
    proxyAjax({
        xhr: {
            proxyResponse: (response) => {
                response.body = 'modified response';
                return response;
            }
        }
    });

    return xhr('response').then(res => {
        assert.equal(res, 'modified response');
    }).then(() => {
        recovery();
    });
};

let test4 = () => {
    proxyAjax({
        xhr: {
            proxySend: () => {
                return {
                    body: '75869'
                };
            }
        }
    });

    return xhr('proxySend').then(res => {
        assert.equal(res, '75869');
    }).then(() => {
        recovery();
    });
};

test1().then(() => {
    return test2();
}).then(() => {
    return test3();
}).then(() => {
    return test4();
}).then(() => {
    console.log('[success]'); // eslint-disable-line
});
