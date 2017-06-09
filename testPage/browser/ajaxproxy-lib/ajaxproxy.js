var ajaxproxy =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(2);


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	let ProxyXhr = __webpack_require__(3);

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


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	let {
	    mirrorClass, cache, hide
	} = __webpack_require__(4);

	let {
	    isFunction
	} = __webpack_require__(6);

	let {
	    forEach, reduce, map
	} = __webpack_require__(7);

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


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(5);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 *
	 * mirror proxy for an object
	 *
	 * visit proxy object instead of visiting object directly
	 *
	 * (proxy, origin)
	 *
	 * proxy prop include get and set
	 */

	let {
	    isFunction
	} = __webpack_require__(6);

	let {
	    forEach, map
	} = __webpack_require__(7);

	let cache = __webpack_require__(10);

	let reflectMirrorContext = (v, obj, shadow) => {
	    if (isFunction(v)) {
	        return function(...args) {
	            let context = this;
	            if (context === obj) {
	                context = shadow;
	            }
	            return v.apply(context, args);
	        };
	    }
	    return v;
	};

	let hide = (name, {
	    cacheOpts,
	    getHandle = id
	} = {}) => {
	    return {
	        setHandle: (v, obj) => {
	            cache.cacheProp(obj, name, v);
	            return STOP_SETTING;
	        },

	        getHandle: (v, obj, shadow, name) => {
	            if (cache.fromCache(obj, name, cacheOpts)) {
	                return cache.fromCache(obj, name, cacheOpts).value;
	            }
	            return getHandle(v, obj, shadow, name);
	        },

	        name
	    };
	};

	let mirrorClass = (Origin, props = [], {
	    mirrorName = '__secret_mirror_instance'
	} = {}) => {
	    // mirror constructor
	    let ProxyClass = function(...args) {
	        let ctx = this;
	        let mirrorInst = ctx[mirrorName] = new Origin(...args);
	        let defProps = map(mirrorInst, (_, name) => {
	            return {
	                name,
	                getHandle: reflectMirrorContext
	            };
	        });
	        props = defProps.concat(props);

	        mirrorProps(ctx, mirrorInst, props);
	    };

	    // prototype
	    ProxyClass.prototype = Origin.prototype;

	    return ProxyClass;
	};

	/**
	 * props = [
	 *      {
	 *          name,
	 *          setHandle,  v => v
	 *          getHandle   v => v
	 *      }
	 * ]
	 */
	let mirrorProps = (obj, shadow, props = []) => {
	    let handleMap = {};
	    forEach(props, ({
	        name, setHandle = id, getHandle = id
	    }) => {
	        if (!handleMap[name]) {
	            Object.defineProperty(obj, name, {
	                set: (v) => {
	                    return handleMap[name].set(v);
	                },
	                get: () => {
	                    return handleMap[name].get();
	                }
	            });
	        }
	        handleMap[name] = {
	            set: (v) => {
	                v = setHandle(v, obj, shadow, name);
	                if (v !== STOP_SETTING) {
	                    // set to shadow
	                    shadow[name] = v;
	                }
	            },

	            get: () => {
	                // fetch from shadow
	                let v = shadow[name];
	                return getHandle(v, obj, shadow, name);
	            }
	        };
	    });
	};

	const STOP_SETTING = {};

	let id = v => v;

	module.exports = {
	    mirrorProps,
	    mirrorClass,
	    cache,
	    STOP_SETTING,
	    reflectMirrorContext,
	    hide
	};


/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * basic types
	 */

	let isUndefined = v => v === undefined;

	let isNull = v => v === null;

	let isFalsy = v => !v;

	let likeArray = v => !!(v && typeof v === 'object' && typeof v.length === 'number' && v.length >= 0);

	let isArray = v => Array.isArray(v);

	let isString = v => typeof v === 'string';

	let isObject = v => !!(v && typeof v === 'object');

	let isFunction = v => typeof v === 'function';

	let isNumber = v => typeof v === 'number' && !isNaN(v);

	let isBool = v => typeof v === 'boolean';

	let isNode = (o) => {
	    return (
	        typeof Node === 'object' ? o instanceof Node :
	        o && typeof o === 'object' && typeof o.nodeType === 'number' && typeof o.nodeName === 'string'
	    );
	};

	let isPromise = v => v && typeof v === 'object' && typeof v.then === 'function' && typeof v.catch === 'function';

	/**
	 * check type
	 *
	 * types = [typeFun]
	 */
	let funType = (fun, types = []) => {
	    if (!isFunction(fun)) {
	        throw new TypeError(typeErrorText(fun, 'function'));
	    }

	    if (!likeArray(types)) {
	        throw new TypeError(typeErrorText(types, 'array'));
	    }

	    for (let i = 0; i < types.length; i++) {
	        let typeFun = types[i];
	        if (typeFun) {
	            if (!isFunction(typeFun)) {
	                throw new TypeError(typeErrorText(typeFun, 'function'));
	            }
	        }
	    }

	    return function() {
	        // check type
	        for (let i = 0; i < types.length; i++) {
	            let typeFun = types[i];
	            let arg = arguments[i];
	            if (typeFun && !typeFun(arg)) {
	                throw new TypeError(`Argument type error. Arguments order ${i}. Argument is ${arg}.`);
	            }
	        }
	        // result
	        return fun.apply(this, arguments);
	    };
	};

	let and = (...args) => {
	    if (!any(args, isFunction)) {
	        throw new TypeError('The argument of and must be function.');
	    }
	    return (v) => {
	        for (let i = 0; i < args.length; i++) {
	            let typeFun = args[i];
	            if (!typeFun(v)) {
	                return false;
	            }
	        }
	        return true;
	    };
	};

	let or = (...args) => {
	    if (!any(args, isFunction)) {
	        throw new TypeError('The argument of and must be function.');
	    }

	    return (v) => {
	        for (let i = 0; i < args.length; i++) {
	            let typeFun = args[i];
	            if (typeFun(v)) {
	                return true;
	            }
	        }
	        return false;
	    };
	};

	let not = (type) => {
	    if (!isFunction(type)) {
	        throw new TypeError('The argument of and must be function.');
	    }
	    return (v) => !type(v);
	};

	let any = (list, type) => {
	    if (!likeArray(list)) {
	        throw new TypeError(typeErrorText(list, 'list'));
	    }
	    if (!isFunction(type)) {
	        throw new TypeError(typeErrorText(type, 'function'));
	    }

	    for (let i = 0; i < list.length; i++) {
	        if (!type(list[i])) {
	            return false;
	        }
	    }
	    return true;
	};

	let exist = (list, type) => {
	    if (!likeArray(list)) {
	        throw new TypeError(typeErrorText(list, 'array'));
	    }
	    if (!isFunction(type)) {
	        throw new TypeError(typeErrorText(type, 'function'));
	    }

	    for (let i = 0; i < list.length; i++) {
	        if (type(list[i])) {
	            return true;
	        }
	    }
	    return false;
	};

	let mapType = (map) => {
	    if (!isObject(map)) {
	        throw new TypeError(typeErrorText(map, 'obj'));
	    }

	    for (let name in map) {
	        let type = map[name];
	        if (!isFunction(type)) {
	            throw new TypeError(typeErrorText(type, 'function'));
	        }
	    }

	    return (v) => {
	        if (!isObject(v)) {
	            return false;
	        }

	        for (let name in map) {
	            let type = map[name];
	            let attr = v[name];
	            if (!type(attr)) {
	                return false;
	            }
	        }

	        return true;
	    };
	};

	let listType = (type) => {
	    if (!isFunction(type)) {
	        throw new TypeError(typeErrorText(type, 'function'));
	    }

	    return (list) => any(list, type);
	};

	let typeErrorText = (v, expect) => {
	    return `Expect ${expect} type, but got type ${typeof v}, and value is ${v}`;
	};

	module.exports = {
	    isArray,
	    likeArray,
	    isString,
	    isObject,
	    isFunction,
	    isNumber,
	    isBool,
	    isNode,
	    isPromise,
	    isNull,
	    isUndefined,
	    isFalsy,

	    funType,
	    any,
	    exist,

	    and,
	    or,
	    not,
	    mapType,
	    listType
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	let {
	    isObject, funType, or, isString, isFalsy, likeArray
	} = __webpack_require__(6);

	let iterate = __webpack_require__(8);

	let {
	    map, reduce, find, findIndex, forEach, filter, any, exist, compact
	} = __webpack_require__(9);

	let contain = (list, item, fopts) => findIndex(list, item, fopts) !== -1;

	let difference = (list1, list2, fopts) => {
	    return reduce(list1, (prev, item) => {
	        if (!contain(list2, item, fopts) &&
	            !contain(prev, item, fopts)) {
	            prev.push(item);
	        }
	        return prev;
	    }, []);
	};

	let union = (list1, list2, fopts) => deRepeat(list2, fopts, deRepeat(list1, fopts));

	let mergeMap = (map1 = {}, map2 = {}) => reduce(map2, setValueKey, reduce(map1, setValueKey, {}));

	let setValueKey = (obj, value, key) => {
	    obj[key] = value;
	    return obj;
	};

	let interset = (list1, list2, fopts) => {
	    return reduce(list1, (prev, cur) => {
	        if (contain(list2, cur, fopts)) {
	            prev.push(cur);
	        }
	        return prev;
	    }, []);
	};

	let deRepeat = (list, fopts, init = []) => {
	    return reduce(list, (prev, cur) => {
	        if (!contain(prev, cur, fopts)) {
	            prev.push(cur);
	        }
	        return prev;
	    }, init);
	};

	/**
	 * a.b.c
	 */
	let get = funType((sandbox, name = '') => {
	    name = name.trim();
	    let parts = !name ? [] : name.split('.');
	    return reduce(parts, getValue, sandbox, invertLogic);
	}, [
	    isObject,
	    or(isString, isFalsy)
	]);

	let getValue = (obj, key) => obj[key];

	let invertLogic = v => !v;

	let delay = (time) => new Promise((resolve) => {
	    setTimeout(resolve, time);
	});

	let flat = (list) => {
	    if (likeArray(list) && !isString(list)) {
	        return reduce(list, (prev, item) => {
	            prev = prev.concat(flat(item));
	            return prev;
	        }, []);
	    } else {
	        return [list];
	    }
	};

	module.exports = {
	    flat,
	    contain,
	    difference,
	    union,
	    interset,
	    map,
	    reduce,
	    iterate,
	    find,
	    findIndex,
	    deRepeat,
	    forEach,
	    filter,
	    any,
	    exist,
	    get,
	    delay,
	    mergeMap,
	    compact
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	let {
	    likeArray, isObject, funType, isFunction, isUndefined, or, isNumber, isFalsy, mapType
	} = __webpack_require__(6);

	/**
	 *
	 * preidcate: chose items to iterate
	 * limit: when to stop iteration
	 * transfer: transfer item
	 * output
	 */
	let iterate = funType((domain = [], opts = {}) => {
	    let {
	        predicate, transfer, output, limit, def
	    } = opts;

	    opts.predicate = predicate || truthy;
	    opts.transfer = transfer || id;
	    opts.output = output || toList;
	    if (limit === undefined) limit = domain && domain.length;
	    limit = opts.limit = stopCondition(limit);

	    let rets = def;
	    let count = 0;

	    if (likeArray(domain)) {
	        for (let i = 0; i < domain.length; i++) {
	            let itemRet = iterateItem(domain, i, count, rets, opts);
	            rets = itemRet.rets;
	            count = itemRet.count;
	            if (itemRet.stop) return rets;
	        }
	    } else if (isObject(domain)) {
	        for (let name in domain) {
	            let itemRet = iterateItem(domain, name, count, rets, opts);
	            rets = itemRet.rets;
	            count = itemRet.count;
	            if (itemRet.stop) return rets;
	        }
	    }

	    return rets;
	}, [
	    or(isObject, isFunction, isFalsy),
	    or(isUndefined, mapType({
	        predicate: or(isFunction, isFalsy),
	        transfer: or(isFunction, isFalsy),
	        output: or(isFunction, isFalsy),
	        limit: or(isUndefined, isNumber, isFunction)
	    }))
	]);

	let iterateItem = (domain, name, count, rets, {
	    predicate, transfer, output, limit
	}) => {
	    let item = domain[name];
	    if (limit(rets, item, name, domain, count)) {
	        // stop
	        return {
	            stop: true,
	            count,
	            rets
	        };
	    }

	    if (predicate(item)) {
	        rets = output(rets, transfer(item, name, domain, rets), name, domain);
	        count++;
	    }
	    return {
	        stop: false,
	        count,
	        rets
	    };
	};

	let stopCondition = (limit) => {
	    if (isUndefined(limit)) {
	        return falsy;
	    } else if (isNumber(limit)) {
	        return (rets, item, name, domain, count) => count >= limit;
	    } else {
	        return limit;
	    }
	};

	let toList = (prev, v) => {
	    prev.push(v);
	    return prev;
	};

	let truthy = () => true;

	let falsy = () => false;

	let id = v => v;

	module.exports = iterate;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	let iterate = __webpack_require__(8);

	let defauls = {
	    eq: (v1, v2) => v1 === v2
	};

	let setDefault = (opts, defauls) => {
	    for (let name in defauls) {
	        opts[name] = opts[name] || defauls[name];
	    }
	};

	let forEach = (list, handler) => iterate(list, {
	    limit: (rets) => {
	        if (rets === true) return true;
	        return false;
	    },
	    transfer: handler,
	    output: (prev, cur) => cur,
	    def: false
	});

	let map = (list, handler, limit) => iterate(list, {
	    transfer: handler,
	    def: [],
	    limit
	});

	let reduce = (list, handler, def, limit) => iterate(list, {
	    output: handler,
	    def,
	    limit
	});

	let filter = (list, handler, limit) => reduce(list, (prev, cur, index, list) => {
	    handler && handler(cur, index, list) && prev.push(cur);
	    return prev;
	}, [], limit);

	let find = (list, item, fopts) => {
	    let index = findIndex(list, item, fopts);
	    if (index === -1) return undefined;
	    return list[index];
	};

	let any = (list, handler) => reduce(list, (prev, cur, index, list) => {
	    let curLogic = handler && handler(cur, index, list);
	    return prev && originLogic(curLogic);
	}, true, falsyIt);

	let exist = (list, handler) => reduce(list, (prev, cur, index, list) => {
	    let curLogic = handler && handler(cur, index, list);
	    return prev || originLogic(curLogic);
	}, false, originLogic);

	let findIndex = (list, item, fopts = {}) => {
	    setDefault(fopts, defauls);

	    let {
	        eq
	    } = fopts;
	    let predicate = (v) => eq(item, v);
	    let ret = iterate(list, {
	        transfer: indexTransfer,
	        limit: onlyOne,
	        predicate,
	        def: []
	    });
	    if (!ret.length) return -1;
	    return ret[0];
	};

	let compact = (list) => reduce(list, (prev, cur) => {
	    if (cur) prev.push(cur);
	    return prev;
	}, []);

	let indexTransfer = (item, index) => index;

	let onlyOne = (rets, item, name, domain, count) => count >= 1;

	let falsyIt = v => !v;

	let originLogic = v => !!v;

	module.exports = {
	    map,
	    forEach,
	    reduce,
	    find,
	    findIndex,
	    filter,
	    any,
	    exist,
	    compact
	};


/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	const SECRET_KEY = '__cache__mirror__';

	let cacheProp = (obj, key, value, {
	    secretKey = SECRET_KEY, hide
	} = {}) => {
	    obj[secretKey] = obj[secretKey] || {};
	    obj[secretKey][key] = {
	        value, hide
	    };
	};

	let getProp = (obj, key, {
	    secretKey = SECRET_KEY
	} = {}) => {
	    obj[secretKey] = obj[secretKey] || {};
	    return obj[secretKey][key];
	};

	let fromCache = (obj, key, {
	    secretKey = SECRET_KEY
	} = {}) => {
	    obj[secretKey] = obj[secretKey] || {};
	    let v = obj[secretKey][key];
	    if (!v) return false;
	    if (v.hide) return false;
	    return v;
	};

	let removeCache = (obj, key, {
	    secretKey = SECRET_KEY
	} = {}) => {
	    obj[secretKey] = obj[secretKey] || {};
	    obj[secretKey][key] = undefined;
	};

	let fetchPropValue = (obj, name, def, opts) => {
	    let cached = getProp(obj, name, opts);
	    if (!cached) {
	        cacheProp(obj, name, def, opts);
	    }
	    return getProp(obj, name).value;
	};

	module.exports = {
	    cacheProp,
	    fromCache,
	    removeCache,
	    getProp,
	    fetchPropValue
	};


/***/ }
/******/ ]);