/* jsio.js */
(function(moduleName, moduleFactory) {

if (typeof(exports) == 'undefined') {
    var exports = {}
    window[moduleName] = exports;
}

moduleFactory(exports);

})('jsio', function(jsio) {

jsio.version = function() {
    return 'mcarterbranch'
}

jsio.getEnvironment = function() {
    if (typeof(node) != 'undefined' && node.version) {
        return 'node';
    }
    return 'browser';
}

switch(jsio.getEnvironment()) {
    case 'node':
        jsio.require = function() {
            jsio.log('what');
        };
        break;
    case 'browser':
        jsio.require = function(pathString, relative) {
            if (!!relative) {
                relative = "";
            }
            var fullPath = joinPaths(pathString, relative);
            if (fullPath in modules) {
                return modules[fullPath];
            }
            var result = getModuleSourceAndPath(fullPath);
            var path = result[1];
            var source = "(function(exports, requires) { " + result[0] + "\n })\n//@ sourceURL=" + path

            var module = {}

            var segments = fullPath.split('.')
            var newRelativePath = segments.slice(0, segments.length - (path.match('__init__.js$') ? 0 : 1)).join('.')
            eval(source)(module, function(pathString) {
                return jsio.require(pathString, newRelativePath);
            })
            modules[pathString] = module;
            return module;
        };
        break;
}

var modules = {}

function joinPaths(pathString, relative) {
    if (pathString[0] != '.')
        return pathString;
    if (!relative)
        return pathString.slice(1);
    return relative + pathString;
}

function getModulePathPossibilities(pathString) {
    var output = []
    var path = pathString.split('.');
    output.push(path.join('/') + '/__init__.js');
    output.push(path.join('/') + '.js');
    return output
}

function getModuleSourceAndPath(pathString) {
    var urls = getModulePathPossibilities(pathString);
    for (var i = 0, url; url = urls[i]; ++i) {
        var xhr = new XMLHttpRequest()
        var failed = false;
        try {
        var xhr = new XMLHttpRequest()
            xhr.open('GET', url, false);
            xhr.send(null);
        } catch(e) {
            console.log('failed');
            failed = true;
        }
        if (failed || // firefox file://
            xhr.status == 404 || // all browsers, http://
            xhr.status == -1100 || // safari file://
            // TODO: to make opera work, add another condition below before uncomment to ensure this isn't firefox.
            //(!failed && xhr.status == 0 && !xhr.responseText)) // opera
            false)
            { 
            console.log(url, 'failed?');
            continue;
        }
        return [xhr.responseText, url];
    }
    throw new Error("Module not found");
}



/*var replaceRe = new RegExp(/require\(([^)]*)\)/g);

function replaceRequires(source) {
    var match;
    var i = 0;
    var outSource = "";
    var dependancies = [];
    while (match = replaceRe.exec(source)) {
        outSource += source.slice(i, match.index); 
        outSource += createSubstituteLoadString(match[1].slice(1, match[1].length-1));
        i = match.index + match[0].length;
        dependancies.push(match[i]);
    }
    outSource += source.slice(i);
    return [outSource, dependancies]
}

/*function createSubstituteLoadString(name) {
    var segments = name.split('.');
    var out = ';var ' + segments[0] + ' = '
    for (var i = 1; i < segments.length; ++i) {
        out += ' { ';
        var segment = segments[i];
        out += segment + ': ';
    }
    out += 'jsio.load("' + name + '")';
    for (var i = 1; i < segments.length; ++i) {
        out += ' } ';
    }
    out += ';';
    return out;
}
*/

});

