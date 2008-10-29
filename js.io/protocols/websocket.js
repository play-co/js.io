/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.require('js.io.tools.parseurl');
js.io.require('js.io.tools.io.delimiter');
js.io.provide('js.io.protocols.websocket');

function WebSocketClient(url) {
    // wss NOT supported yet...

    // private
    var FRAME_START = String.fromCharCode(0);
    var FRAME_END = String.fromCharCode(255);
    var SCHEMES = { "wss": [true, 815], "ws": [false, 81] }
    var STATUS = "HTTP/1.1 101 Web Socket Protocol Handshake";
    var headers = {}
    var reader = new js.io.tools.io.delimiter.Reader();
    var conn = new js.io.TCPSocket();
    var self = this;

    // all problems end up here
    var error = function(msg, no_close) {
        if (! no_close) {
            self.readyState = self.CLOSED;
            conn.close();
        }
        throw new Error(msg);
    }

    // conn.onopen callback
    var onOpen = function() {
        // initiate handshake
        conn.send("GET " + resource + " HTTP/1.1\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nHost: " + host + "\r\nOrigin: " + origin + "\r\n\r\n");
    }

    // conn.onclose callback
    var onClosed = function() {
        // connection lost
        if (self.onclosed) { self.onclosed(); }
    }

    var setHeader = function(line) {
        /******
        * this function is called by recv
        * to parse and process headers
        ******/
        var colSplit = line.indexOf(':');
        var key = line.slice(0,colSplit).toLowerCase();
        var val = line.slice(colSplit+1);
        if (val[0] == ' ') {
            val = val.slice(1);
        }
        if (!key || !val) {
            error('NULL_HEADER_ERR');
        }
        if (key.indexOf('\r') != -1 || key.indexOf('\n') != -1) {
            error('INVALID_HEADER_ERR');
        }
        if (key in headers) {
            error('DUPLICATE_HEADER_ERR');
        }
        if (key == "websocket-origin" && val != origin) {
            error('WRONG_ORIGIN_ERR');
        }
        else if (key == "websocket-location" && val != url) {
            error('WRONG_LOCATION_ERR');
        }
        else if (key == "upgrade" && val != "WebSocket") {
            error('WRONG_UPGRADE_ERR');
        }
        else if (key == "connection" && val != "Upgrade") {
            error('WRONG_CONNECTION_ERR');
        }

        // implement cookie-setting here

        headers[key] = val;
    }

    var recv = function(data) {
        /*********
        * data is delivered here by the reader, which
        * is a js.io.tools.io.delimiter.Reader object
        *********/
        if (self.readyState == self.CONNECTING) {
            // initialize connection
            var lines = data.split("\r\n");
            var status = lines[0];
            lines = lines.slice(1);
            if (status != STATUS) {
                error('HANDSHAKE_ERR');
            }
            for (var n=0; n<lines.length; n++) {
                setHeader(lines[n]);
            }
            if ("websocket-origin" in headers && "websocket-location" in headers && "upgrade" in headers && "connection" in headers) {
                reader.set_delim(FRAME_END);
                self.readyState = self.OPEN;
                if (self.onopen) { self.onopen(); }
            }
            else {
                error('MISSING_HEADER_ERR');
            }
        }
        else if (self.readyState == self.OPEN) {
            // receive WebSocket frames
            if (data[0] != FRAME_START) {
                error('INVALID_FRAME_ERR');
            }
            if (self.onmessage) {
                self.onmessage(data.slice(1));
            }
        }
    }

    // host, port, resource, origin
    if (url[url.length-1] != '/') {
        url += '/';
    }
    var parsedUrl = new js.io.tools.parseurl.Parse(url);
    if (!parsedUrl.success || ! parsedUrl.scheme in SCHEMES) {
        error('SYNTAX_ERR', true);
    }
    var scheme = parsedUrl.scheme;
    var secure = SCHEMES[scheme][0];
    var host = parsedUrl.host;
    var port = parsedUrl.port || SCHEMES[scheme][1];
    var resource = parsedUrl.path || "/";
    if (parsedUrl.query) {
        resource += "?" + parsedUrl.query;
    }
    var origin = scheme + "://" + document.domain;
    if (document.location.port) {
        origin += ":" + document.location.port;
    }

    // public
    self.CONNECTING = 0;
    self.OPEN = 1;
    self.CLOSED = 2;
    self.onopen = null;
    self.onmessage = null;
    self.onclosed = null;
    self.readyState = self.CONNECTING;
    self.url = url;

    self.postMessage = function(data) {
        // send data to the server
        if (self.readyState != self.OPEN) {
            error('INVALID_STATE_ERR', true);
        }
        conn.send(FRAME_START + data + FRAME_END);
    }

    self.disconnect = function() {
        // close the connection
        conn.close();
        self.readyState = self.CLOSED;
    }

    // initialize reader
    reader.set_delim("\r\n\r\n");
    reader.set_cb(recv);

    // initialize connection
    conn.onread = reader.read;
    conn.onopen = onOpen;
    conn.onclose = onClosed;
    conn.open(host, port, true);
}

js.io.declare('js.io.protocols.websocket.Client',WebSocketClient,{});
