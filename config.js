var path = require('path');
var config = exports;

config.queue = {
    host: "127.0.0.1",
    port: 6379,
    password: undefined,
    database: 0
};

config.storage = {
    type: 'file',
    file: {
        location: './webroot'
    },
    s3: {
        key:    null,
        secret: null,
        bucket: 'taras.muchmala.com'
    }
};


var localConfigPath = './config.local.js';
if (path.existsSync(localConfigPath)) {
    var localConfig = require(localConfigPath),
        deepExtend = require('muchmala-common').misc.deepExtend;

    deepExtend(config, localConfig);

}