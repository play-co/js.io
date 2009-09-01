(function() {
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
var included = {}

base.require = function(pathString) {
    var path = pathString.split('.');
    if (included[pathString]) {
        return included[pathString];
    }
    var xhr = new XMLHttpRequest()
    var url = path.join('/') + '/__init__.js';
    xhr.open('GET', url, false);
    xhr.send(null);
    if (xhr.status == 404) {
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
    ifr.contentWindow.base = parent.base;
    var ifrNamespace = {}
    for (k in ifr.contentWindow) {
        ifrNamespace[k] = ifr.contentWindow[k];
    }
    ifr.contentDocument.write('<script>' + jsSrc + '</script>');
    ifr.contentDocument.close();
    var exports = {}
    for (k in ifr.contentWindow) {
        if (ifrNamespace[k] != ifr.contentWindow[k]) {
            exports[k] = ifr.contentWindow[k];
        }
    }
    included[pathString] = exports;
    return exports;
}

})()

