var muchmalaCommon = require('muchmala-common'),
    config = require('./config');

var mq = muchmalaCommon.queueAdapter(config.queue);

mq.subscribe('new-pictures', function() {
    //@TODO: Implement puzzle generation :)
});