jsio('import Class, bind, log');

var loggers = {}
var levels = exports.levels = {
    DEBUG: 0,
    LOG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4
};

var production = false;

exports.setProduction = function(prod) {
	production = !!prod;
}

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
        return function() {
            if (level < this.level || production) return;
            log.apply(log, [type, this.name].concat(Array.prototype.slice.call(arguments, 0)));
        }
    }

    this.debug = makeLogFunction(levels.DEBUG, "DEBUG");
    this.log = makeLogFunction(levels.LOG, "LOG");
    this.info = makeLogFunction(levels.INFO, "INFO");
    this.warn = makeLogFunction(levels.WARN, "WARN");
    this.error = makeLogFunction(levels.ERROR, "ERROR");

})
