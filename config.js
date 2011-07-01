var path = require('path');
var config = exports;

config.queue = {
    host: process.env.MUCHMALA_QUEUE_HOST || '127.0.0.1',
    port: process.env.MUCHMALA_QUEUE_PORT || 6379,
    password: process.env.MUCHMALA_QUEUE_PASSWORD || undefined,
    database: process.env.MUCHMALA_QUEUE_DATABASE || 0
};

config.storage = {
    type: process.env.MUCHMALA_STORAGE_TYPE || 'file',
    file: {
        location: process.env.MUCHMALA_STORAGE_FILE_LOCATION || '/opt/muchmala/webroot'
    },
    s3: {
        key:    process.env.MUCHMALA_STORAGE_S3_KEY || null,
        secret: process.env.MUCHMALA_STORAGE_S3_SECRET || null,
        bucket: process.env.MUCHMALA_STORAGE_S3_BUCKET || 'dev.muchmala.com'
    }
};
