'use strict';

let {
    mirrorClass, cache, hide
} = require('mirrorproxy');

let {
    isFunction
} = require('basetype');

let {
    forEach
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

                {
                    name: 'onreadystatechange',
                    setHandle: (v, obj) => {
                        if (!isFunction(v)) return v;
                        return function(...args) {
                            return Promise.resolve(
                                obj.readyState === 4 ? proxyResponseReady(obj, opts) : null
                            ).then(() => {
                                return v.apply(this, args);
                            });
                        };
                    }
                },

                // hide all read only properties
                hide('readyState'),

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
        body: obj.response
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
    status, statusText, body
}) => {
    // apply add to cache
    cache.cacheProp(obj, 'status', status);
    cache.cacheProp(obj, 'statusText', statusText);
    cache.cacheProp(obj, 'response', body);
    cache.cacheProp(obj, 'responseText', body);
    cache.cacheProp(obj, 'responseXML', body);
    // TODO more response body
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
                        cacheResponse(obj, response);
                        // apply
                        obj.onreadystatechange && obj.onreadystatechange();
                    }
                });
            } else {
                // send request
                return send();
            }
        });
    };
};
