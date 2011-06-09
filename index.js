var fs = require('fs'),
    async = require('async'),

    muchmalaCommon = require('muchmala-common'),
    puzzleGenerator = muchmalaCommon.puzzleGenerator,
    logger = muchmalaCommon.logger,
    db = muchmalaCommon.db,
    config = require('./config'),
    resources = {};

var NEW_IMAGES_QUEUE = 'new-image';
var GENERATED_IMAGES_QUEUE = 'new-puzzle';

var IMAGE_MIN_WIDTH = 500;
var IMAGE_MAX_WIDTH = 2000;

var IMAGE_MIN_HEIGHT = 500;
var IMAGE_MAX_HEIGHT = 2000;

var PUZZLES_DIR = '/puzzles';

function main() {
    init(function(err) {
        if (err) {
            logger.error(err);
            return;
        }

        resources.queue.subscribe(NEW_IMAGES_QUEUE, onNewImage);
        logger.info('Ready. Listening for new images.');
    });
}

function init(callback) {
    attachValidators();

    async.series({
        queue: function(callback) {
            callback(null, new muchmalaCommon.queueAdapter(config.queue));
        },
        imagesStorage: function(callback) {
            muchmalaCommon.storage.createStorage(config.storage.type, config.storage[config.storage.type], callback);
        },
        puzzlesStorage: function(callback) {
            muchmalaCommon.storage.createStorage(config.storage.type, config.storage[config.storage.type], callback);
        }
    }, function(err, initializedResources) {
        resources = initializedResources;

        callback();
    });
}

function attachValidators() {
    puzzleGenerator.validators.append([
        puzzleGenerator.validators.getWidthValidator(IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH),
        puzzleGenerator.validators.getWidthValidator(IMAGE_MIN_HEIGHT, IMAGE_MAX_HEIGHT)
    ]);
}

function onNewImage(options) {
    logger.debug(options);

    async.waterfall([function(callback) {
        resources.imagesStorage.get(options.path, callback);

    }, function(imagePath, callback) {
        puzzleGenerator.createPuzzle(imagePath, options, callback);

    }, function(metadata, callback) {
        metadata.puzzleId = db.generateId();

        uploadPuzzle(metadata, function(err) {
            callback(err, metadata);
        });

    }, function(metadata, callback) {
        resources.queue.publish(GENERATED_IMAGES_QUEUE, metadata);
        callback();

    }], function(err) {
        if (err) {
            logger.error(err);
            return;
        }

        logger.info("Image processed");
    });
}

function uploadPuzzle(metadata, callback) {
    fs.readdir(metadata.resultDir, function(err, files) {
        if (err) {
            return callback(err);
        }

        async.forEachSeries(files, function(file, callback) {
            logger.debug("Saving ", metadata.resultDir + '/' + file, "to storage");
            resources.puzzlesStorage.put(metadata.resultDir + '/' + file, PUZZLES_DIR + '/' + metadata.puzzleId + '/' + file, callback);
        }, callback);
    });
}

main();