'use strict';

let {
    mirrorClass, cache
} = require('mirrorproxy');

let {
    isFunction
} = require('basetype');

let {
    forEach
} = require('bolzano');

let id = v => v;

let unique = {};

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
    let reqSetMap = {
        'send': proxySend,
        'open': proxyOpen,
        'setRequestHeader': proxySetRequestHeader
    };

    let proxyXMLHttpRequest = (opts = {}) => {
        env.XMLHttpRequest = mirrorClass(env.XMLHttpRequest, [], {
            getHandle: (v, name, obj) => {
                // check cache first
                if (cache.fromCache(obj, name)) {
                    return cache.fromCache(obj, name).value;
                } else if (reqSetMap[name] && isFunction(v)) {
                    return reqSetMap[name](v, obj, opts);
                }

                return v;
            },

            setHandle: (v, name, obj) => {
                if (name === 'onreadystatechange' && isFunction(v)) {
                    return function(...args) {
                        return Promise.resolve(
                            obj.readyState === 4 ? proxyResponseReady(obj, opts) : null
                        ).then(() => {
                            return v.apply(this, args);
                        });
                    };
                }
                return v;
            }
        });
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

    return Promise.resolve(proxyResponse(response)).then((response) => {
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
        if (args[0] === unique) {
            args.shift();
            return v.apply(this, args);
        } else {
            let [header, value] = args;
            let options = cache.fetchPropValue(obj, 'options', {
                headers: {}
            }, {
                hide: true
            });
            options.headers[header] = value;
        }
    };
};

// open(method, url, async, user, password)
let proxyOpen = (v, obj) => {
    return function(...args) {
        if (args[0] === unique) {
            args.shift();
            return v.apply(this, args);
        } else {
            let [method, url, asyn, user, password] = args;
            if (asyn !== false) asyn = true;
            cache.cacheProp(obj, 'options', {
                method, url, user, password,
                'async': asyn,
                headers: {}
            }, {
                hide: true
            });
        }
    };
};

// TODO sync
let proxySend = (v, obj, {
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
            this.open(unique, options.method, options.url, options.async, options.user, options.password);

            let headers = options.headers;
            forEach(headers, (value, name) => {
                this.setRequestHeader(name, value);
            });

            cache.removeCache(obj, 'options');

            if (proxySend) {
                return Promise.resolve(proxySend(options)).then(response => {
                    if (options.async !== false) {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve(response);
                            }, 0);
                        });
                    }
                    return response;
                }).then((response) => {
                    cache.cacheProp(obj, 'readyState', 4);
                    cacheResponse(obj, response);
                    // apply
                    obj.onreadystatechange && obj.onreadystatechange();
                });
            } else {
                // send request
                return v.apply(this, [options.body]);
            }
        });
    };
};
