/* stomp.js
 *
 * JavaScript implementation of the STOMP (Streaming Text Oriented Protocol)
 *  for use with TCPConnection or a facsimile
 *
 * Frank Salim (frank.salim@gmail.com) (c) 2008 Orbited (orbited.org)
 * Rui Lopes (ruilopes.com)
 */

STOMP_DEBUG = false;

if (STOMP_DEBUG) {
    function getStompLogger(name) {
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
} else {
    function getStompLogger(name) {
        return {
            debug: function() {},
            dir: function() {}
        };
    }
}


// Implement Array.indexOf (needed in IE 7 or lower).
// NB: This was borrowed from Mozilla.
// See http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array:indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(elt /*, from*/) {
        var len = this.length;
        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0)
            from += len;
        
        for (; from < len; from++) {
            if (from in this && this[from] === elt)
                return from;
        }
        return -1;
    };
}


// NB: This is loosly based on twisted.protocols.basic.LineReceiver
//     See http://twistedmatrix.com/documents/8.1.0/api/twisted.protocols.basic.LineReceiver.html
LineProtocol = function(transport) {
    var log = getStompLogger("LineProtocol");
    var self = this;
    var buffer = null;
    var isLineMode = true;

    //
    // Transport callbacks implementation.
    //

    transport.onopen = function() {
        buffer = [];
        isLineMode = true;
        self.onopen();
    };

    transport.onclose = function(code) {
        buffer = null;
        self.onclose(code);
    };

    transport.onerror = function(error) {
        self.onerror(error);
    };

    transport.onread = function(data) {
        var decoded = []
        for (var i = 0; i < data.length; ++i) {
            decoded.push(data.charCodeAt(i));
        }
        data = decoded
        log.debug("transport.onread: enter isLineMode=", isLineMode, " buffer=", buffer, " data=", data);

        if (isLineMode) {
            buffer.push.apply(buffer, data);
            data = [];

            var start = 0;
            var end;
            while ((end = buffer.indexOf(10, start)) >= 0 && isLineMode) {
                // TODO it would be nice that bytesToUTF8 received the
                //      start and end indexes, if it did, we didn't
                //      need the slice copy.
                var bytes = buffer.slice(start, end);
                var line = bytesToUTF8(bytes);
                self.onlinereceived(line);
                start = end + 1;
            }
            // remove the portion (head) of the array we've processed.
            buffer.splice(0, start);

            if (isLineMode) {
                // TODO if this buffer length is above a given threshold, we should
                //      send an alert "max line length exceeded" and empty buffer
                //      or even abort.
            } else {
                // we've left the line mode and what remains in buffer is raw data.
                data = buffer;
                buffer = [];
            }
        }

        if (data.length > 0) {
            self.onrawdatareceived(data);
        }

        log.debug("transport.onread: leave");
    };

    //
    // Protocol implementation.
    //

    self.setRawMode = function() {
        log.debug("setRawMode");
        isLineMode = false;
    };

    // TODO although this is a nice interface, it will do a extra copy
    //      of the data, a probable better alternative would be to
    //      make onrawdatareceived return the number of consumed bytes
    //      (instead of making it comsume all the given data).
    self.setLineMode = function(extra) {
        log.debug("setLineMode: extra=", extra);
        isLineMode = true;
        if (extra && extra.length > 0) {
            var encoded = []
            for (var i = 0; i < extra.length; ++i) {
                encoded.push(String.fromCharCode(extra[i]))
            }

            transport.onread(encoded.join(""));
        }
    };

    self.send = function(data) {
        log.debug("send: data=", data);
        var encoded = []
        for (var i = 0; i < data.length; ++i) {
            encoded.push(String.fromCharCode(data[i]))
        }
        return transport.send(encoded.join(""));
        return transport.send(data);
    };

    self.open = function(host, port, isBinary) {
        log.debug("open: host=", host, ':', port, ' isBinary=', isBinary);
        transport.open(host, port, isBinary);
    };

    self.close = function() {
        log.debug("close");
        transport.close();
    };

    //
    // callbacks for the events generated by this
    //
    // XXX these callbacks names should be camelCased

    self.onopen = function() {};
    self.onclose = function() {};
    self.onerror = function(error) {};
    self.onlinereceived = function(line) {};
    self.onrawdatareceived = function(data) {};
};


// TODO propose to rename this to BaseStompClient
//      See the comment in the callbacks zone bellow.
// TODO add ";" to all lines (where it makes sense).
// TODO remove deprecated stuff.
//
// Deprecated attributes:
//
//  user : string
//      the user name used to login into the STOMP server.
//
//
// Methods:
//
//  connect(domain : string, port : int, user : string, password : string)
//      connects to the given STOMP server.
//
//      the connection is established after ``onconnected'' is received.
//
//  disconnect()
//      disconnects from current STOMP server.
//
//      the connection is disconnected after ``onclose'' is received.
//
//      TODO: implement ``ondisconnect''.
//
//  send(message : string|int[], destination : string, extraHeaders : {}|undefined)
//      sends the given message to destination.
//
//      to send a binary message use an int[].
//
//  subscribe(destination : string)
//      starts receiving messages from the given destination.
//
//  unsubscribe(destination : string)
//      stops receiving messages from the given destination.
//
//
// Callbacks:
//
//  onopen()
//      underline transport is openned.
//
//  onclose()
//      underline transport is closed.
//
//  onerror(error : Error)
//      there was an error.
//
//  onframe(frame : Frame)
//      received a STOMP frame.
//
//      this will dispatch for a specific method based on the frame
//      type, eg. when frame.type is "MESSAGE" this calls
//      onmessageframe(frame).
//
//      frame is an object with the following properties:
//
//          type : string
//          headers : {string: string}
//          body : string|int[]
//
//  onconnectedframe(frame : Frame)
//      received a CONNECTED STOMP frame.
//
//  onmessageframe(frame : Frame)
//      received a MESSAGE STOMP frame.
//
//  onreceiptframe(frame : Frame)
//      received a RECEIPT STOMP frame.
//
//  onerrorframe(frame : Frame)
//      received a ERROR STOMP frame.
//
//
// Deprecated callbacks:
//
//  onmessage(frame)
//      use ``onmessageframe'' instead.
//
//      received a MESSAGE STOMP frame.
//
STOMPClient = function() {
    var log = getStompLogger("STOMPClient");
    var self = this;
    var protocol = null;
    var buffer = [];
    var type = null;
    var headers = null;
    var remainingBodyLength = null;

    // Deprecated attributes:
    self.user = null;

    // TODO probably this function should be move into a common base...
    function trim(str) {
        // See http://blog.stevenlevithan.com/archives/faster-trim-javascript
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    
    //
    // LineProtocol implementation.
    //

    function protocol_onLineReceived(line) {
        log.debug("protocol_onLineReceived: line=", line);

        if (line.length == 0) {
            // ignore empty lines before the type line.
            if (type === null)
                return;
            // we reached the end headers.
            log.debug("onLineReceived: all headers:");
            log.dir(headers);
            if ('content-length' in headers) {
                // NB: content-length does not include the trailing NUL,
                //     but we need to account it.
                remainingBodyLength = parseInt(headers['content-length']) + 1;
            } else {
                remainingBodyLength = null;
            }
            protocol.setRawMode();
            return;
        }

        if (type === null) {
            log.debug("onLineReceived: begin ", line, " frame");
            type = line;
            headers = {};
            return;
        }

        var sep = line.search(":");
        var key = trim(line.slice(0, sep));
        var value = trim(line.slice(sep + 1));
        headers[key] = value;
        log.debug("onLineReceived: found header ", key, "=", value);
    }

    function protocol_onRawDataReceived(data) {
        log.debug("protocol_onRawDataReceived: data.length=", data.length);

        if (remainingBodyLength === null) {
            // we're doing a text message parsing.

            buffer.push.apply(buffer, data);

            var end = buffer.indexOf(0);
            if (end >= 0) {
                // split into head (bytes) and tail (buffer).
                var bytes = buffer.splice(0, end + 1);
                doDispatch(bytes, buffer);
            }
        } else {
            // we're doing a binary message parsing.

            var toRead = Math.min(data.length, remainingBodyLength);
            remainingBodyLength -= toRead;

            // split into head (bytes) and tail (data).
            // NB: we don't do "toRead + 1" because that NUL char was
            //     already accounted in remainingBodyLength.
            var bytes = data.splice(0, toRead);
            // buffer will contain the whole message body.
            buffer.push.apply(buffer, bytes);

            if (remainingBodyLength === 0) {
                doDispatch(buffer, data);
            }
        }
    }

    function doDispatch(bytes, extra) {
        // remove NUL (this marks EOF).
        bytes.pop();

        var frame = {
            type: type,
            headers: headers,
            body: (remainingBodyLength === null ? bytesToUTF8(bytes) : bytes)
        };

        log.debug("doDispatch: end frame");
        log.dir(frame);

        self.onframe(frame);

        buffer = [];
        type = null;
        headers = {};
        remainingBodyLength = null;

        protocol.setLineMode(extra);
    }

    //
    // Callbacks
    //

    function Ignored() {}

    self.onopen = Ignored;

    self.onclose = Ignored;

    self.onerror = Ignored;

    self.onframe = function(frame) {
        switch (frame.type) {
            case 'CONNECTED':
                self.onconnectedframe(frame);
                break;
            case 'MESSAGE':
                self.onmessageframe(frame);
                break;
            case 'RECEIPT':
                self.onreceiptframe(frame);
                break;
            case 'ERROR':
                self.onerrorframe(frame);
                break;
            default:
                // TODO throw or call onerror with a proper error
                throw("Unknown STOMP frame type " + frame.type);
        }
    };

    self.onconnectedframe = Ignored;

    self.onreceiptframe = Ignored;

    self.onmessageframe = function(frame) {
        // TODO stop calling deprecated onmessage.
        if (this.onmessage)
            this.onmessage(frame);
    };

    self.onerrorframe = Ignored;

    // Deprecated callbacks
    self.onmessage = Ignored;

    //
    // Methods
    //

    self.sendFrame = function(type, headers, body) {
        var isText = typeof(body) === "string";
        var head = [type];
        if (!isText && body !== undefined) {
            head.push("content-length:" + body.length);
        }
        for (var key in headers) {
            if (key === "content-length")
                continue;
            head.push(key + ":" + headers[key]);
        }
        head.push("\n");
        var bytes = UTF8ToBytes(head.join("\n"));
        if (body) {
            bytes.push.apply(bytes, isText ? UTF8ToBytes(body) : body);
        }
        bytes.push(0);
        protocol.send(bytes);
    };

    // TODO Deprecated
    self.send_frame = self.sendFrame;

    self.connect = function(domain, port, user, password) {
        // TODO deprecated
        self.user = user;

        function onopen() {
            self.sendFrame("CONNECT", {'login':user, 'passcode':password});
            self.onopen();
        }
        protocol = self._createProtocol();
        protocol.onopen = onopen;
        // XXX even though we are connecting to onclose, this never gets fired
        //     after we shutdown orbited.
        protocol.onclose = self.onclose;
        // TODO what should we do when there is a protocol error?
        protocol.onerror = self.onerror;
        protocol.onlinereceived = protocol_onLineReceived;
        protocol.onrawdatareceived = protocol_onRawDataReceived;
        protocol.open(domain, port, true);
    };

    // NB: this is needed for the unit tests.
    self._createProtocol = function() {
        return new LineProtocol(new TCPSocket());
    };

    self.disconnect = function() {
        // NB: after we send a DISCONNECT frame, the STOMP server
        //     should automatically close the transport, which will
        //     trigger an "onclose" event.
        self.sendFrame("DISCONNECT");
    };

    self.send = function(message, destination, extraHeaders) {
        var headers = {destination:destination};
        if (extraHeaders) {
            for (var key in extraHeaders)
                headers[key] = extraHeaders[key];
        }
        self.sendFrame("SEND", headers, message);
    };

    self.subscribe = function(destination) {
        self.sendFrame("SUBSCRIBE", {"destination": destination});
    };
    
    self.unsubscribe = function(destination) {
        self.sendFrame("UNSUBSCRIBE", {"destination": destination});
    };

    self.begin = function(id) {
        self.sendFrame("BEGIN", {"transaction": id});
    };

    self.commit = function(id) {
        self.sendFrame("COMMIT", {"transaction": id});
    };

    self.abort = function(id) {
        self.sendFrame("ABORT", {"transaction": id});
    };

    self.ack = function(message_id, transaction_id) {
        // TODO implement
    };
}
