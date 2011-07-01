var fs = require('fs'),
    async = require('async'),
    config = require('./config'),
    common = require('muchmala-common'),
    generator = common.puzzleGenerator,
    logger = common.logger,
    db = common.db,
    resources = {};

var NEW_IMAGES_QUEUE = 'new-image';
var NEW_PUZZLES_QUEUE = 'new-puzzle';

var IMAGE_MIN_WIDTH = 500;
var IMAGE_MAX_WIDTH = 2500;

var IMAGE_MIN_HEIGHT = 500;
var IMAGE_MAX_HEIGHT = 2500;

var PUZZLES_DIR = '/puzzles';
var COVERS_DIR = '/covers';
var FRAMES_DIR = '/frames';

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
            callback(null, new common.queueAdapter(config.queue));
        },
        imagesStorage: function(callback) {
            common.storage.createStorage(config.storage.type, config.storage[config.storage.type], callback);
        },
        puzzlesStorage: function(callback) {
            common.storage.createStorage(config.storage.type, config.storage[config.storage.type], callback);
        }
    }, function(err, initializedResources) {
        resources = initializedResources;

        callback();
    });
}

function attachValidators() {
    generator.validators.append([
        generator.validators.getWidthValidator(IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH),
        generator.validators.getHeightValidator(IMAGE_MIN_HEIGHT, IMAGE_MAX_HEIGHT)
    ]);
}

function onNewImage(options) {
    logger.debug(options);

    async.waterfall([
        function(callback) {
            generator.createCovers(options.pieceSize, callback);
        },
        function(coversData, callback) {
            uploadCovers(coversData.resultDir, coversData.size, callback);
        },
        function(callback) {
            generator.createFrame(options.pieceSize, callback);
        },
        function(frameData, callback) {
            uploadFrames(frameData.resultDir, frameData.size, callback);
        },
        function(callback) {
            resources.imagesStorage.get(options.path, callback);
        },
        function(imagePath, callback) {
            generator.createPuzzle(imagePath, options, callback);
        },
        function(metadata, callback) {
            metadata.puzzleId = db.generateId();
            metadata.sessionId = options.sessionId;

            uploadPuzzle(metadata, function(err) {
                callback(err, metadata);
            });
        },
        function(metadata, callback) {
            resources.queue.publish(NEW_PUZZLES_QUEUE, metadata);
            callback();
        }
    ], function(error) {
        if (error) {
            resources.queue.publish(NEW_PUZZLES_QUEUE + '-' + options.sessionId, {error: error});
            logger.error(error);
        } else {
            logger.info("Image processed");
        }
    });
}

function uploadPuzzle(puzzleData, callback) {
    var src = puzzleData.resultDir;
    var dst = PUZZLES_DIR + '/' + puzzleData.puzzleId;
    uploadDir(resources.puzzlesStorage, src, dst, callback);
}

function uploadCovers(src, size, callback) {
    var dst = COVERS_DIR + '/' + size;
    uploadDir(resources.puzzlesStorage, src, dst, callback);
}

function uploadFrames(src, size, callback) {
    var dst = FRAMES_DIR + '/' + size;
    uploadDir(resources.puzzlesStorage, src, dst, callback);
}

function uploadDir(storage, src, dst, callback) {
    fs.readdir(src, function(error, files) {
        if (error) {
            return callback(error);
        }

        async.forEachSeries(files, function(file, callback) {
            var srcFile = src + '/' + file;
            var dstFile = dst + '/' + file;
            logger.debug('Saving ' + srcFile + ' to ' + dstFile);
            storage.put(srcFile, dstFile, callback);
        }, callback);
    });
}

main();
