(function() {
if (!window.console) {
    var doc = document;
    console = {
        log: function() {
            var d = doc.createElement('div')
            d.innerHTML = [].join.call(arguments, " ")
            doc.body.appendChild(d);
        }
    }
}

base = {}

function hideIframe (ifr) {
    ifr.style.display = 'block';
    ifr.style.width = '0';
    ifr.style.height = '0';
    ifr.style.border = '0';
    ifr.style.margin = '0';
    ifr.style.padding = '0';
    ifr.style.overflow = 'hidden';
    ifr.style.visibility = 'hidden';
};

function joinPaths(a,b) {
    return a + '.' + b;
}

var included = {}

function extract_from(exports, from_list) {
    if (from_list.length == 0) {
        return exports;
    }
    var fromExports = {}
    for (k in exports) {
        if (from_list.indexOf(k) != -1) {
            fromExports[k] = exports[k];
        }
    }
    return fromExports;
    
}

base.require = function(pathString) {
    var path = pathString.split('.');
    var from_list = [].slice.call(arguments,1);
    if (included[pathString]) {
        x = extract_from(included[pathString], from_list);
        return x
    }
    var xhr = new XMLHttpRequest()
    var url = path.join('/') + '/__init__.js';
    var failed = false;
    try {
        xhr.open('GET', url, false);
        xhr.send(null);
    } catch(e) { failed = true;}
    if (failed || xhr.status == 404) {
    var url = path.join('/') + '.js';
        xhr.open('GET', url, false);
        xhr.send(null);
        if (xhr.status == 404) {
            throw new Error("Module not found");
        }
    }
    var jsSrc = xhr.responseText;
    var ifr = document.createElement('iframe')
    hideIframe(ifr);
    document.body.appendChild(ifr);
    ifr.contentWindow.require = function(subPathString) {
        var calcPathString = subPathString;
        if (subPathString[0] == '.') {
            var pathArray = pathString.split('.');
            var args = subPathString.split('.');
            args.splice(0,0,pathArray.length-1, 1);
            pathArray.splice.apply(pathArray, args);
            var i;
            while ((i = pathArray.indexOf("")) != -1) {
                console.log('...');
                pathArray.splice(i,1)
            }
            calcPathString = pathArray.join('.')
        }
        console.log('fetch', calcPathString);
        var exports = base.require(calcPathString);
        for (key in exports) {
            try {
                ifr.contentWindow[key] = exports[key];
            } catch(e) { console.log(key, e); } // property only had a getter
        }
        return exports;
    }
    if (window.console) {
        ifr.contentWindow.console = console;
    }
    var ifrNamespace = {}
    for (k in ifr.contentWindow) {
        ifrNamespace[k] = ifr.contentWindow[k];
    }
//    ifr.contentDocument.write('<script>require=parent.base.require</script>')
    ifr.contentDocument.write('<script>' + jsSrc + '</script>');
    ifr.contentDocument.close();
    var from_list = [].slice(arguments,1);
    var exports = {}
    for (k in ifr.contentWindow) {
        if (ifrNamespace[k] != ifr.contentWindow[k]) {
            exports[k] = ifr.contentWindow[k];
        }
    }
    included[pathString] = exports;
    M =  extract_from(exports, from_list)
    return M;
}

})()

