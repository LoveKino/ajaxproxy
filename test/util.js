'use strict';

var xhr = function(path) {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', path);

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

module.exports = {
    xhr
};
