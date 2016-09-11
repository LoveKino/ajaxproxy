'use strict';

let ProxyXhr = require('./xhr');

// TODO fetch

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
module.exports = ({
    env = window
} = {}) => {
    let OriginXMLHttpRequest = env.XMLHttpRequest;

    let proxyXhr = ProxyXhr(env);

    let proxyAjax = ({
        xhr
    } = {}) => {
        proxyXhr(xhr);
    };

    let recovery = () => {
        env.XMLHttpRequest = OriginXMLHttpRequest;
    };

    return {
        proxyXhr,
        proxyAjax,
        recovery
    };
};
