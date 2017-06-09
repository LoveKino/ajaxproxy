'use strict';

let {
    mirrorClass, cache, hide
} = require('mirrorproxy');

let {
    isFunction
} = require('basetype');

let {
    forEach, reduce, map
} = require('bolzano');

let id = v => v;

/**
 *  control aspect
 *
 *  (1) request data
 *
 *  http request
 *
 *  options = {
 *      url
 *      method,
 *      headers: {
 *      },
 *      body
 *  }
 */

module.exports = (env = window) => {
    let proxyXMLHttpRequest = (opts = {}) => {
        let proxyGet = (proxy) => (v, obj, shadow) => proxy(v, obj, shadow, opts);

        env.XMLHttpRequest =
            mirrorClass(env.XMLHttpRequest, [
                hide('send', {
                    getHandle: proxyGet(proxySend)
                }),

                hide('open', {
                    getHandle: proxyGet(proxyOpen)
                }),

                hide('setRequestHeader', {
                    getHandle: proxyGet(proxySetRequestHeader)
                }),

                hide('getResponseHeader', {
                    getHandle: proxyGet(proxyGetResponseHeader)
                }),

                hide('getAllResponseHeaders', {
                    getHandle: proxyGet(proxyGetAllResponseHeaders)
                }),

                {
                    name: 'onreadystatechange',
                    setHandle: (v, obj) => {
                        if (!isFunction(v)) return v;
                        return function(e) {
                            return Promise.resolve(
                                obj.readyState === 4 ? proxyResponseReady(obj, opts) : null
                            ).then(() => {
                                // TODO event proxyer
                                let newE = reduce(e, (prev, v, n) => {
                                    prev[n] = v;
                                    return prev;
                                }, {});
                                newE.isTrusted = true;
                                newE.target = obj;
                                newE.srcElement = obj;
                                newE.currentTarget = obj;
                                return v.apply(this, newE);
                            });
                        };
                    }
                },

                // hide all read only properties
                hide('readyState'),

                hide('responseURL'),

                hide('response'),

                hide('responseText'),

                hide('status'),

                hide('statusText'),

                hide('responseXML'),

                hide('responseType')
            ]);
    };

    return proxyXMLHttpRequest;
};

let proxyResponseReady = (obj, {
    proxyResponse = id
}) => {
    // TODO response headers
    let response = {
        status: obj.status,
        statusText: obj.statusText,
        bodyType: obj.responseType,
        body: obj.response,
        headers: parseResponseHeaders(obj.getAllResponseHeaders())
    };

    let options = cache.fetchPropValue(obj, 'options', {
        headers: {}
    }, {
        hide: true
    });

    return Promise.resolve(proxyResponse(response, options)).then((response) => {
        cacheResponse(obj, response);
    });
};

let cacheResponse = (obj, {
    status, statusText, body, headers = {}
}) => {
    // apply add to cache
    cache.cacheProp(obj, 'status', status);
    cache.cacheProp(obj, 'statusText', statusText);
    cache.cacheProp(obj, 'response', body);
    cache.cacheProp(obj, 'responseText', body);
    cache.cacheProp(obj, 'responseXML', body);
    // TODO more response body
    // response headers
    cache.cacheProp(obj, 'responseHeaders', headers, {
        hide: true
    });
};

// setRequestHeader(header, value)
let proxySetRequestHeader = (v, obj) => {
    return function(...args) {
        let [header, value] = args;
        let options = cache.fetchPropValue(obj, 'options', {
            headers: {}
        }, {
            hide: true
        });
        options.headers[header] = value;
    };
};

// open(method, url, async, user, password)
let proxyOpen = (v, obj) => {
    return function(...args) {
        let [method, url, asyn, user, password] = args;
        if (asyn !== false) asyn = true;
        cache.cacheProp(obj, 'options', {
            method, url, user, password,
            'async': asyn,
            headers: {}
        }, {
            hide: true
        });
    };
};

let proxyGetResponseHeader = (v, obj, mirror) => {
    return function(name = '') {
        let headers = cache.fetchPropValue(obj, 'responseHeaders', {}, {
            hide: true
        });
        name = map(name.split('-'), (item) => {
            let first = item[0].toUpperCase();
            return first + item.substring(1);
        }).join('-');
        if (headers[name]) return headers[name];
        return v.apply(mirror, [name]);
    };
};

let proxyGetAllResponseHeaders = (v, obj, mirror) => {
    return function() {
        let headers = cache.fetchPropValue(obj, 'responseHeaders', null, {
            hide: true
        });

        if (headers) return headersToString(headers);
        return v.apply(mirror, []);
    };
};

// TODO sync
let proxySend = (v, obj, mirror, {
    proxyOptions = id, proxySend
}) => {
    return function(data) {
        let options = cache.fetchPropValue(obj, 'options', {
            headers: {}
        }, {
            hide: true
        });

        options.body = data;

        // make default ready handler
        if(!obj.onreadystatechange) {
            obj.onreadystatechange = id;
        }

        return Promise.resolve(proxyOptions(options)).then((options) => {
            mirror.open(options.method, options.url, options.async, options.user, options.password);

            let headers = options.headers;
            forEach(headers, (value, name) => {
                mirror.setRequestHeader(name, value);
            });

            let send = () => v.apply(mirror, [options.body || null]);

            if (proxySend) {
                return Promise.resolve(proxySend(options)).then((response) => {
                    if (response && options.async !== false) {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve(response);
                            }, 0);
                        });
                    }
                    return response;
                }).then((response) => {
                    if (!response) {
                        return send();
                    } else {
                        cache.cacheProp(obj, 'readyState', 4);
                        cache.cacheProp(obj, 'responseURL', options.url);
                        cacheResponse(obj, response);
                        // apply
                        let e = new Event('readystatechange', {
                            bubble: false,
                            cancelBubble: false,
                            cancelable: false,
                            defaultPrevented: false,
                            eventPhase: 0,
                            isTrusted: true,
                            path: [],
                            returnValue: true
                        });
                        obj.dispatchEvent(e);
                    }
                });
            } else {
                // send request
                return send();
            }
        });
    };
};

/**
 * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
 * headers according to the format described here:
 * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
 * This method parses that string into a user-friendly key/value pair object.
 */
function parseResponseHeaders(headerStr) {
    var headers = {};
    if (!headerStr) {
        return headers;
    }
    var headerPairs = headerStr.split('\u000d\u000a');
    for (var i = 0; i < headerPairs.length; i++) {
        var headerPair = headerPairs[i];
        // Can't use split() here because it does the wrong thing
        // if the header value has the string ": " in it.
        var index = headerPair.indexOf('\u003a\u0020');
        if (index > 0) {
            var key = headerPair.substring(0, index);
            var val = headerPair.substring(index + 2);
            headers[key] = val;
        }
    }
    return headers;
}

let headersToString = (headers) => {
    return reduce(headers, (prev, v, n) => {
        prev += `${n}: ${v}\n`;
        return prev;
    }, '');
};
