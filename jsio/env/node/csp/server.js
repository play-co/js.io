/*
CSP server implemented against Node JS, by Jacob Rus.

--------------------

Copyright (c) 2009 Jacob Rus

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

 
// Make the dependancies work rather or not this file was used as a
// node module or a jsio module.
var base = require.__jsio ? (require.__dir + "/") : "";
var uuid = process.require(base + '../../../uuid.js');
var utf8 = process.require(base + '../../../utf8.js');
var base64 = process.require(base + '../../../base64.js');
process.include(base + 'util.js');
var csp = this.csp = exports;

;(function () {

var sessionDict = {};
var varNames = {
  // per session
  'ct' : 'contentType',
  'ps' : 'prebufferSize',
  'p'  : 'preamble',
  'rp' : 'requestPrefix',
  'rs' : 'requestSuffix',
  'bp' : 'batchPrefix',
  'bs' : 'batchSuffix',
  'i'  : 'interval',
  'du' : 'duration',
  'is' : 'isStreaming',
  'g'  : 'gzipOk',
  'se' : 'sse',
  // 's'  : 'sessionKey', // per request, handled at the csp.Server level
  // 'a'  : 'ackId',      // left here to instruct other implementors.
  // 'd'  : 'data',
  // 'n'  : 'noCache',
};

csp.Session = Class(function() {
  this.init = function () {
    // this.lastAck = 0; // 'a' variable
    this.key = uuid.uuid(8);       // generate 8-character base-62 UUID
    sessionDict[this.key] = this;  // Add session to sessions dictionary
    this.connection = null;        // this.connection set from outside.
    this.outgoingPacketBuffer = [];
    this.incomingPacketBuffer = [];
    this.lastSequentialIncomingId = 0
    this.cometResponse = null;
    this.durationTimer = null;
    this.intervalTimer = null;
    this.timeoutTimer = null;
    this.outgoingPacketId = 1;
    this.variables = { // set variables to defaults
      'contentType'   : 'text/html',
      // 'prebufferSize' : '0', // result stored in 'prebuffer' variable.
      'prebuffer'     : '',
      'preamble'      : '',
      'requestPrefix' : '',
      'requestSuffix' : '',
      'batchPrefix'   : '',
      'batchSuffix'   : '',
      'interval'      : '0',
      'duration'      : '30',
      'isStreaming'   : '0',
      'gzipOk'        : '',
      'sse'           : '',
    };
    this.resetTimeoutTimer();
  };
  this.teardownSession = function () {
    this.connection.readyState = (this.connection.readyState === 'open' ? 'writeOnly' : 'closed');
    this.connection.emit('eof');
    // XXX when the client calls close, do we want to allow the server to
    // keep sending them stuff, write only? And what about when they time out?
    delete sessionDict[this.key];
  };
  // send data to the client
  this.send = function (data) {
    // base64-encode any string data with control characters or non-ASCII
    var packet = (typeof data === 'string' && (/[^\r\n\t\x32-\x7E]/).test(data)) ?
      [this.outgoingPacketId, 1, base64.encode(data)] :
      [this.outgoingPacketId, 0, data];
    this.outgoingPacketId += 1;
    this.outgoingPacketBuffer.push(packet);
    if (this.cometResponse) {
      this.sendBatch([packet]);
    }; // else if no comet connection, just keep buffering packets
  };
  this.close = function () {
    // call this to close a comet connection, and stop writing to it.
    // any remaining incoming packets will still fire 'receive' events.
    this.send(null);
    this.connection.readyState = (this.connection.readyState === 'open' ? 'readOnly' : 'closed');
  };
  this.updateVars = function (params) {
    for (param in params) {
      var key = varNames[param];
      if (!key) continue;
      var value = params[param];
      // if gzipOk or contentType changes value, finish up any comet response
      // with the previous values
      if (key in Set('gzipOk', 'contentType') && value != this.variables[key] && this.cometResponse) {
        this.completeResponse();
      };
      if (key in this.variables) {
        this.variables[key] = value;
      }
      else if (key == 'prebufferSize') {
        var prebufferSize = parseInt(value);
        if (prebufferSize > 0) {
          // string of spaces of length prebufferSize
          this.variables.prebuffer = (new Array(prebufferSize+1)).join(' ');
        };
      };      
    };
  };
  this.isStreaming = function () {
    return (this.variables.isStreaming === '1') && (parseInt(this.variables.duration) > 0);
  };
  this.resetDurationTimer = function () {
    var duration = 1000 * parseInt(this.variables.duration);
    this.durationTimer = setTimeout(bind(this, this.completeResponse), duration);
  };
  this.resetIntervalTimer = function () {
    myClearTimeout(this.intervalTimer);
    if (this.variables.interval === '0') {
      return;
    };
    var interval = 1000 * parseInt(this.variables.interval);
    this.intervalTimer = setTimeout(bind(this, this.sendBatch), interval);
  };
  this.resetTimeoutTimer = function () {
    myClearTimeout(this.timeoutTimer);
    // Give the client 50% longer than the duration of a comet request before 
    // we time them out.
    var timeout = 1000 * parseInt(this.variables.duration) * 1.5;
    this.timeoutTimer = setTimeout(bind(this, this.teardownSession), timeout);
  };
  this.sendHeaders = function (response, contentLength) {
    if (contentLength === 'stream') {
      response.sendHeader(200, [
        ['Content-Type', this.variables.contentType],
        ['Cache-Control', 'no-cache, must-revalidate'],
        ['Transfer-Encoding', 'chunked'],
        // XXX: Make Access-Control configurable
        ['Access-Control-Allow-Origin', '*']
      ]);
    }
    else if (contentLength >= 0) {
      response.sendHeader(200, [
        ['Content-Type', this.variables.contentType],
        ['Cache-Control', 'no-cache, must-revalidate'],
        ['Content-Length', contentLength],
        // XXX: Make Access-Control configurable
        ['Access-Control-Allow-Origin', '*']
      ]);
    }
    else {
      debug('INVALID USE OF sendHeaders FUNCTION')
    };
  };
  this.startStream = function () {
    this.sendHeaders(this.cometResponse, 'stream');
    var preamble = this.variables.prebuffer + this.variables.preamble;
    if (preamble) {
      this.cometResponse.sendBody(preamble);
    }
    this.resetIntervalTimer();
  };
  this.sendBatch = function (packetArray) {
    if (!packetArray) { packetArray = []; }; // default value
    var prefix = this.variables.batchPrefix + '(';
    var suffix = ')' + this.variables.batchSuffix;
    if (this.variables.sse === '1' && packetArray) {
      // ID of last packet in the batch is the "SSE ID"
      suffix += 'id: ' + packetArray[packetArray.length - 1][0] + '\r\n';
    };
    var batch = prefix + JSON.stringify(packetArray) + suffix;
    if (this.isStreaming()) {
      this.cometResponse.sendBody(batch);
      this.resetIntervalTimer();
    } else {
      var body = (this.variables.prebuffer + this.variables.preamble + batch);
      this.sendHeaders(this.cometResponse, body.length)
      this.cometResponse.sendBody(body);
      this.cometResponse.finish();
      this.cometResponse = null;
      myClearTimeout(this.durationTimer);
    };
  };
  this.completeResponse = function() {
    if (this.isStreaming()) {
      this.cometResponse.finish(); // close a stream
      this.cometResponse = null;
      myClearTimeout(this.durationTimer);
      myClearTimeout(this.intervalTimer);
    } else {
      this.sendBatch() // send empty batch to poll/longpoll
    };
  };
  this.receiveAck = function (ackId) {
    this.resetTimeoutTimer();
    while (this.outgoingPacketBuffer.length && ackId >= this.outgoingPacketBuffer[0][0]) {
      this.outgoingPacketBuffer.shift(); // remove first element
    };
  };
  // used for handshake, send, and close (not comet or reflect)
  this.renderResponse = function (response, body) {
    var prefix = this.variables.requestPrefix + '(';
    var suffix = ')' + this.variables.requestSuffix;
    body = prefix + body + suffix;
    this.sendHeaders(response, body.length);
    response.sendBody(body);
    response.finish();
  };
  // a csp.Server instance dispatches resources to this object's functions
  this.dispatch = {
    handshake: function (request, response) {
      var body = JSON.stringify( {'session': this.key})
      this.renderResponse(response, body);
    },
    comet: function (request, response) {
      this.cometResponse = response;
      if (this.isStreaming()) {
        this.startStream();
      };
      // we have buffered packets, so send them.
      if (this.outgoingPacketBuffer.length) {
        this.sendBatch(this.outgoingPacketBuffer);
      };
      // if we have no events to deliver, or if this is a stream, start a
      // duration timer, after which the response will always complete
      if (!this.outgoingPacketBuffer.length || this.isStreaming()) {
        this.resetDurationTimer();
      };
    },
    send: function (request, response) {
      node.stdio.writeError('raw request data: ' + request.data + '\n')
      var batch = JSON.parse(request.data);
      while (batch[0] != undefined) {
        // packetId, encoding, content = batch.shift()
        var packet = batch.shift(),
          packetId = packet[0], encoding = packet[1], content = packet[2];
        if (encoding === 0) {
          packetContent = content;
        } else if (encoding === 1) {
          packetContent = base64.decode(content);
        } else {
          debug('BAD PACKET ENCODING,', encoding, '... dropping packet');
          break; // XXX probably should end connection here.
        }
        this.incomingPacketBuffer[packetId - 1 - this.lastSequentialIncomingId] = packetContent;
      };
      while (this.incomingPacketBuffer[0] !== undefined) {
        var nextPacketPayload = this.incomingPacketBuffer.shift();
        this.lastSequentialIncomingId += 1;
        this.connection._emitReceive(nextPacketPayload);
      }; // this can leave packets in the buffer, to handled later, in order
      this.renderResponse(response, '"OK"');
    },
    close: function (request, response) {
      this.teardownSession();
      this.renderResponse(response, '"OK"');
    },
    reflect: function (request, response) {
      var body = request.data;
      this.sendHeaders(response, body.length);
      response.sendBody(body);
      response.finish();
    },
    streamtest: function (request, response) {
      debug('streamtest'); // XXX who knows what this does...?
    },
  };
});

csp.Connection = Class(node.EventEmitter, function() {
  this.init = function (session) {
    this.remoteAddress = null; // XXX get remote address from requests
    this.readyState = 'open';
    this._encoding = 'utf8';
  };
  this._emitReceive = function (data) {
    // XXX make sure to do incremental utf-8 decoding, and buffer any
    // left-over bytes in connection for the next time we emit data.
    data = (this._encoding === 'utf8') ? utf8.decode(data) : bytes_to_raw(data);
    this.emit('receive', data);
  };
  var known_encodings = Set('utf8', 'raw');
  this.setEncoding = function (encoding) {
    assert(encoding in known_encodings, 'unrecognized encoding');
    this._encoding = encoding;
  };
  this.send = function (data, encoding) {
    if (!(this.readyState in Set('writeOnly', 'open'))) {
      // XXX make error type for this
      throw new Error("Socket is not writable in readyState: " + this.readyState);
    }
    encoding = encoding || 'utf8';
    assert(encoding in known_encodings, 'unrecognized encoding');
    data = (encoding === 'utf8') ? utf8.encode(data) : raw_to_bytes(data);
    session.send(data);
  };
  this.close = function () {
    session.close();
  };
});


csp.createServer = function (connection_listener) {
  return new csp.Server().addListener('connection', connection_listener);
};



csp.Server = Class(node.EventEmitter, function () {
  this.init () {
    // pass
  };
  var session_url = ''; // XXX this could be changed or made into a parameter
  var CSPError = function (message, code) {
    this.message = message; this.code = code;
  };
  CSPError.prototype = AssertionError.prototype;
  var assertOrRenderError = function (exp, message, code) {
    if (!exp) { throw new CSPError(message, code); };
  };
  this._renderError = function (response, code, message) {
    response.sendHeader(code, [['Content-Type', 'text/plain'],
                               ['Content-Length', message.length]]);
    response.sendBody(message);
    response.finish();
  };
  this._sendStatic = function (path, response) {
    debug('SEND STATIC', path, response)
    staticFile(path.join('/'))  // defined in util.js
      .addCallback(function(content){
        response.sendHeader(200, [['Content-Type', 'text/plain'],
                                  ['Content-Length', content.length]]);
        response.sendBody(content);
        response.finish();
      })
      .addErrback(function(){
        this._renderError(response, 404, 'No such file, ' + path);
      });
  };
  // returns a request which fires with the whole post body as bytes, or
  // immediately with null for GET requests
  this._getRequestBody = function (request) {
    var promise = new node.Promise();
    if (request.method === 'GET') {
      reschedule(function () {
        promise.emitSuccess(raw_to_bytes(null));
      });
    } else {
      var body = [];
      request.setBodyEncoding('raw');
      request
        .addListener('body', function (chunk) {
          body.push.apply(body, chunk); // body += chunk
        })
        .addListener('complete', function () {
          promise.emitSuccess(raw_to_bytes(body));
        });
    };
    return promise;
  };
  // The logic of the server goes in the 'handleRequest' function, which is
  // called every time a new request comes in.
  var resources = Set('static', 'handshake', 'comet', 'send', 'close', 'reflect', 'streamtest');
  var methods = Set('GET', 'POST');
  this._handleRequest = function (request, response) {
    this._getRequestBody(request).addCallback(bind(this, function(body) {
      try {
        assertOrRenderError(startswith(request.uri.path, session_url + '/'),
                            'Request to invalid session URL', 404);
        assertOrRenderError(request.method in methods,
                            'Invalid HTTP method, ' + request.method, 405);
        var relpath = request.uri.path.slice(session_url.length + 1).split('/');
        var resource = relpath[0];
        if (resource === 'static') {
          this._sendStatic(relpath, response);
          return;
        };
        assertOrRenderError((relpath.length == 1) && (resource in resources),
                            'Invalid resource, ' + relpath, 404);
        var params = request.uri.params;
        // 'data' is either the POST body if it exists, or the 'd' variable
        request.data = body || params.d || null;
        if (resource === 'handshake') {
          assertOrRenderError(!params.s, 'Handshake cannot have session', 400);
          try {
            var dict = JSON.parse(request.data);
            assert((dict instanceof Object) && !(dict instanceof Array));
          } catch (err) {
            debug(['INVALID HANDSHAKE, ', request]);
            throw new CSPError('Invalid data parameter for handshake', 400);
          };
          var session = new csp.Session();
          var connection = new csp.Connection(session);
          session.connection = connection;
          this.emit('connection', connection);
          connection.emit('connect');
        } else {
          var session = sessionDict[params.s];
          assertOrRenderError(session, 'Invalid or missing session', 400);
          // 'ackId' is either the 'Last-Event-Id' header, or the 'a' variable
          var ackId = parseInt(request.headers['Last-Event-Id']) || parseInt(params.a) || -1
          session.receiveAck(ackId);
        };
        session.updateVars(params);
        session.dispatch[resource].call(session, request, response); // logic is in session
      }
      catch (err) {
        if (err instanceof CSPError) {
          this._renderError(response, err.code, err.message);          
        } else {
          debug('Unexpected Error: ', err.message);
          this._renderError(response, 500, 'Unknown Server error');
        };
      };
    }));
  };
  this.listen = function (port, host) {
    var server = node.http.createServer(this._handleRequest);
    server.listen(port, host);
    hoststring = host ? host : 'localhost';
    puts('CSP running at http://' + hoststring + ':' + port + session_url + '/');
  };
});

})(); // end closure w/ code for csp

function start_echo_server () {
  var server = csp.createServer(function(connection) {
    connection.addListener('receive', function (data) {
      connection.send(data);
    });
  });
  server.listen(8000);
  puts('CSP-based echo server running.')
};
// start_echo_server();   // un-comment to run echo server when this file runs