'use strict';

let {
    mirrorClass
} = require('mirrorproxy');

let {
    isFunction
} = require('basetype');

let {
    forEach
} = require('bolzano');

let cache = require('./cache');

let cacheOptions = cache('__cache__options', {
    headers: {}
});

let cacheResponse = cache('__cache_response', {});

let id = v => v;

let isTarFun = (name, v, target) => name === target && isFunction(v);

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
    let proxyXMLHttpRequest = (opts = {}) => {
        env.XMLHttpRequest = mirrorClass(env.XMLHttpRequest, [], {
            getHandle: (v, name, obj) => {
                if (isTarFun(name, v, 'send')) {
                    return proxySend(v, obj, opts);
                } else if (isTarFun(name, v, 'open')) {
                    return proxyOpen(v, obj, opts);
                } else if (isTarFun(name, v, 'setRequestHeader')) {
                    return proxySetRequestHeader(v, obj, opts);
                } else if (name === 'status') {
                    return getResponseItem(obj, 'status');
                } else if (name === 'statusText') {
                    return getResponseItem(obj, 'statusText');
                } else if (name === 'response' ||
                    name === 'responseText' ||
                    name === 'responseXML'
                ) {
                    return getResponseItem(obj, 'body');
                }

                return v;
            },

            setHandle: (v, name, obj) => {
                if (name === 'onreadystatechange' && isFunction(v)) {
                    return function(...args) {
                        return Promise.resolve(
                            this.readyState === 4 ? proxyResponseReady(obj, this, opts) : null
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

let proxyResponseReady = (obj, mirror, {
    proxyResponse = id
}) => {
    let response = {
        status: mirror.status,
        statusText: mirror.statusText,
        bodyType: mirror.responseType,
        body: mirror.response
    };

    // TODO response headers
    return Promise.resolve(proxyResponse(response)).then((response) => {
        // apply
        cacheResponse.init(obj, response);
    });
};

let getResponseItem = (obj, name) => {
    let resObj = cacheResponse.get(obj);
    return resObj[name];
};

// setRequestHeader(header, value)
let proxySetRequestHeader = (v, obj) => {
    let options = cacheOptions.get(obj);

    return function(...args) {
        if (args[0] === unique) {
            args.shift();
            return v.apply(this, args);
        } else {
            let [header, value] = args;
            options.headers[header] = value;
        }
    };
};

// open(method, url, async, user, password)
let proxyOpen = (v, obj) => {
    return function(...args) {
        let options = cacheOptions.init(obj);

        if (args[0] === unique) {
            args.shift();
            return v.apply(this, args);
        } else {
            let [method, url, asyn, user, password] = args;
            options.method = method;
            options.url = url;
            options.async = asyn || true;
            options.user = user;
            options.password = password;
        }
    };
};

// TODO sync
let proxySend = (v, obj, {
    proxyOptions = id
}) => {
    let options = cacheOptions.get(obj);

    return function(data) {
        options.body = data;

        return Promise.resolve(proxyOptions(options)).then((options) => {
            // TODO interface to modify
            this.open(unique, options.method, options.url, options.async, options.user, options.password);

            let headers = options.headers;
            forEach(headers, (value, name) => {
                this.setRequestHeader(name, value);
            });
            cacheOptions.init(obj);
            //
            return v.apply(this, [options.body]);
        });
    };
};
