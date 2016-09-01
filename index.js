'use strict';

let {
    mirrorClass
} = require('mirrorproxy');

let {
    isFunction
} = require('basetype');

/**
 *  control aspect
 *
 *  (1) request data
 *
 */
module.exports = ({
    env = window
} = {}) => {
    let OriginXMLHttpRequest = env.XMLHttpRequest;

    let proxyXMLHttpRequest = ({
        beforeSend
    } = {}) => {
        env.XMLHttpRequest = mirrorClass(OriginXMLHttpRequest, [], {
            getHandle: (v, name) => {
                if (name === 'send' && isFunction(v)) {
                    return function(...args) {
                        // TODO send request point
                        if (beforeSend) {
                            args = beforeSend(this, args) || args;
                        }
                        return v.apply(this, args);
                    };
                }
                return v;
            },

            setHandle: (v, name) => {
                if (name === 'onreadystatechange' && isFunction(v)) {
                    return function(...args) {
                        if (this.readyState === 4) {
                            // TODO response end point
                        }
                        return v.apply(this, args);
                    };
                }
                return v;
            }
        });
    };

    let proxyAjax = ({
        xhr
    } = {}) => {
        proxyXMLHttpRequest(xhr);
    };

    let recovery = () => {
        env.XMLHttpRequest = OriginXMLHttpRequest;
    };

    return {
        proxyXMLHttpRequest,
        proxyAjax,
        recovery
    };
};
