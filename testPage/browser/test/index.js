'use strict';

var xhr = function(path) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', 'http://127.0.0.1:8080/' + path);

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

let assert = chai.assert; // eslint-disable-line

describe('proxy xhr', () => {
    it('base', () => {
        let {
            proxyAjax, recovery
        } = ajaxproxy(); // eslint-disable-line
        proxyAjax();
        return xhr('fixture/test1.txt').then(res => {
            assert.equal(res, '1234\n');
        }).then(() => {
            recovery();
        });
    });

    it('proxy options', () => {
        let {
            proxyAjax, recovery
        } = ajaxproxy(); // eslint-disable-line

        proxyAjax({
            xhr: {
                proxyOptions: (options) => {
                    options.url = 'http://127.0.0.1:8080/fixture/test2.txt';

                    options.headers = {
                        Accept: 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    };

                    return options;
                }
            }
        });

        return xhr('/fixture/test1.txt').then(res => {
            assert.equal(res, '0000\n');
        }).then(() => {
            recovery();
        });
    });

    it('proxy response', () => {
        let {
            proxyAjax, recovery
        } = ajaxproxy(); // eslint-disable-line

        proxyAjax({
            xhr: {
                proxyResponse: (res) => {
                    res.body = 'tamper';
                    return res;
                }
            }
        });
        return xhr('/fixture/test1.txt').then(res => {
            assert.equal(res, 'tamper');
        }).then(() => {
            recovery();
        });
    });

    it('no onReadyState bug', (done) => {
        let {
            proxyAjax, recovery
        } = ajaxproxy(); // eslint-disable-line

        let assert = chai.assert; // eslint-disable-line
        proxyAjax({
            xhr: {
                proxyResponse: (response) => {
                    assert.equal(response.body, '1234\n');
                    done();
                    return response;
                }
            }
        });

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('GET', 'http://127.0.0.1:8080/fixture/test1.txt');
        xmlhttp.setRequestHeader('Accept', 'text');
        xmlhttp.send();
    });

    // TODO test header proxy
});
