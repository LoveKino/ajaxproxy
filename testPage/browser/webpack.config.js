var path = require('path');

module.exports = {
    entry: {
        ajaxproxy: ['../../index.js']
    },
    output: {
        path: path.resolve(__dirname, 'ajaxproxy-lib'),
        filename: '[name].js',
        libraryTarget: 'var',
        library: 'ajaxproxy'
    },
    module: {},
    plugins: []
};
