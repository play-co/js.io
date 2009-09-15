require('jsio', ['Class', 'log']);

var loggers = {}
var levels = exports.levels = {
    DEBUG: 0,
    LOG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4
};
exports.getLogger = function(name) {
    if (!(name in loggers)) {
        loggers[name] = new exports.Logger(name);
    }
    return loggers[name];
}

exports.Logger = Class(function() {
    
    this.init = function(name, level) {
        if (!level) {
            level = levels.LOG;
        }
        this.name = name;
        this.level = level;
    }
    this.setLevel = function(level) {
        this.level = level;
    }
    function makeLogFunction(level, type) {
        var a = [];
        return function() {
            if (level < this.level) return;
            a.splice.call(arguments,0,0,type, this.name)
            log.apply(log, arguments);
        }
    }

    this.debug = makeLogFunction(levels.DEBUG, "DEBUG");
    this.log = makeLogFunction(levels.LOG, "LOG");
    this.info = makeLogFunction(levels.INFO, "INFO");
    this.warn = makeLogFunction(levels.WARN, "WARN");
    this.error = makeLogFunction(levels.ERROR, "ERROR");

})
