'use strict';

module.exports = (key, initObj) => {
    let get = (obj) => {
        if (!obj[key]) {
            init(obj);
        }
        return obj[key];
    };

    let init = (obj, v) => {
        v = v || initObj;
        obj[key] = v;
        return v;
    };

    return {
        get,
        init
    };
};
