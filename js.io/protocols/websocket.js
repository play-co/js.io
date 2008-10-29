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
    var FRAME_START = '\x00';
    var FRAME_END = '\xff';
    var SCHEMES = { "wss": [true, 815], "ws": [false, 81] }
    var HANDSHAKE = [
        "HTTP/1.1 101 Web Socket Protocol Handshake",
        "Upgrade: WebSocket",
        "Connection: Upgrade"
    ]
    var headers = {}
    var reader = new js.io.tools.io.delimiter.Reader();
    reader.set_delim("\r\n");
    reader.set_cb(recv);
    var self = this;

    // public
    self.CONNECTING = 0;
    self.OPEN = 1;
    self.CLOSED = 2;
    self.onopen = null;
    self.onmessage = null;
    self.onclosed = null;
    self.readyState = self.CONNECTING;
    self.url = url;

    // host, port, resource, origin
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

    // connect
    var conn = new js.io.TCPSocket();
    conn.onread = reader.read;
    conn.onopen = onOpen;
    conn.onclose = onClosed;
    conn.open(host, port, false);

    var onOpen = function() {
        // initiate handshake
        conn.send("GET " + resource + " HTTP/1.1\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nHost: " + host + "\r\nOrigin: " + origin + "\r\n\r\n");
    }

    var onClosed = function() {
        // connection lost
        if (self.onclosed) { self.onclosed(); }
    }

    var error = function(msg, no_close) {
        // all problems end up here
        if (! no_close) { conn.close(); }
        throw new Error(msg);
    }

    var setHeader = function(line) {
        /******
        * WebSocket headers complicate things
        * because there is no "end headers" delimiter.
        * We just have to be careful...
        ******/
        var key = '';
        var val = '';
        [key, val] = line.split(":");
        key = key.toLowerCase();
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
            if (HANDSHAKE) {
                // initial handshake
                if (data == HANDSHAKE[0]) {
                    HANDSHAKE = HANDSHAKE.slice(1);
                }
                else {
                    error('HANDSHAKE_ERR');
                }
            }
            else {
                // headers
                setHeader(data);
                if ("websocket-origin" in headers && "websocket-location" in headers) {

                    // maybe don't jump right into this
                    // in case of leftover headers...

                    reader.set_delim(FRAME_END);
                    self.readyState = self.OPEN;
                    if (self.onopen) { self.onopen(); }
                }
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
}

js.io.declare('js.io.protocols.websocket.Client',WebSocketClient,{});
