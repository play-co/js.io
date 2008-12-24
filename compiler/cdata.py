import os

BATCH_STR = """
batch.py VERSION

VERSION: version of js.io
    such as x.y.z
"""

HELP_STR = """
compiler.py TARGET NAME TITLE VERSION

TARGET: initial javascript file
    such as [some_path]%s[some_protocol].js
NAME: name for final, compiled code
    such as [some_path]%s[new_filename].js
TITLE: title for new code
    such as "Standalone WebSocket Client"
VERSION: version of js.io
    such as x.y.z
"""%(os.path.sep, os.path.sep)

BASE_STR = """
js.io.DEBUG = false;
js.io.getLogger = function(/*String*/ loggerName, /*bool*/ loggerOn) {
    if (loggerOn == null) {
        loggerOn = js.io.DEBUG;
    }
    if (loggerOn && typeof(Orbited)) {
        var logger = Orbited.getLogger(name);
        if (!("dir" in logger)) {
            logger.dir = function() {};
        }
        return logger;
    }
    else if (loggerOn && typeof(console)) {
        return {
            debug: function() {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(name, ": ");
                console.debug.apply(console, args);
            },
            dir: function() {
                console.debug(name, ":");
                console.dir.apply(console, arguments);
            }
        };
    }
    else {
        return {
            debug: function() {},
            dir: function() {}
        };
    }
}
js.io.setSocket = function(/*Socket*/ s) {
    /***************
    * shouldn't be necessary to call js.io.setSocket manually
    * unless you're using a socket we don't know about,
    * in which case, you should notify the mailing list
    ***************/
    if (s) { // manual socket setting
        js.io.TCPSocket = s;
    }
    else if (js.io.TCPSocket == null) { // socket discovery
        js.io.TCPSocket = _discoverSocket();
    }
}
var _discoverSocket = function() {
    try { return TCPSocket; } catch(e) {}         // browser (someday)
    try { return Orbited.TCPSocket; } catch(e) {} // Orbited
    // discover other sockets here...
}
js.io.setSocket();
"""
