/*
Multiplexing socket proxy implemented against Node JS and my
Node CSP server, by Jacob Rus.

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

include("util.js");
include("server.js")

// msp = "Multiplexing Socket Proxy"
var msp = this.msp = {};
;(function () {
  frameTypes = ['open', 'close', 'data'];
  var errorCodes = {
    InvalidHandshake: 102,
    UserConnectionReset: 103,
    RemoteConnectionTimeout: 104,
    Unauthorized: 106,
    RemoteConnectionFailed: 108,
    RemoteConnectionClosed: 109,
    ProtocolError: 110,
  };
  var FRAME = {
    OPENED: 0,
    CLOSED: 1,
    DATA: 2,
  };
  msp.ProxyConnection = function (inConnection) {
    var inBuffer = '';
    var outConnections = {};
    var receiveData = function (data) {
      var frameBegin;
      inBuffer += raw_to_bytes(data);
      try {
        while ((frameBegin = inBuffer.indexOf('[')) != -1) {
          var frameEnd = parseInt(inBuffer.slice(0, frameBegin)) + frameBegin;
          assert (!isNaN(frameEnd), 'Invalid frame size prefix');
          if (inBuffer.length < frameEnd) {
            break; // whole frame hasn't arrived yet
          }
          var frame = JSON.parse(inBuffer.slice(frameBegin, frameEnd));
          inBuffer = inBuffer.slice(frameEnd) // remove frame from buffer
          // frame consists of connection id, frame type, arbitrary other arguments
          assert(frame instanceof Array && frame.length >= 2, 'Invalid frame');
          var connectionId = frame.shift();
          var frameType = frameTypes[frame.shift()];
          assert(frameType, 'Unrecognized frame type');
          var args = frame; args.unshift(connectionId); // put back connection ID
          dispatchFrame[frameType].apply(this, args);
        };
      } catch (e) {
        debug('PROTOCOL ERROR: ', (e.message || 'unknown error'));
        shutdown(true);
      };
    };
    var shutdown = function (had_error) {
      // close all outgoing TCP connections      
      for (connectionId in outConnections) {
        if (had_error) {
          closeOutgoing(connectionId, 'ProtocolError');
        } else {
          closeOutgoing(connectionId, 'UserConnectionReset');
        }
        outConnections[connectionId].listeners('connect') = [];
        outConnections[connectionId].listeners('receive') = [];
        outConnections[connectionId].listeners('eof') = [];
        outConnections[connectionId].listeners('disconnect') = [];
      };
    };
    inConnection
      .addListener('receive', receiveData)
      .addListener('eof', shutdown)
      .addListener('disconnect', shutdown)
      .setEncoding('raw');
    var send = function (frame) {
      payload = JSON.stringify(frame);
      inConnection.send(bytes_to_raw(payload.length + ',' + payload), 'raw');
    };
    var closeOutgoing = function (connectionId, errorType) {
      if (connectionId in outConnections) {
        var code = errorCodes[errorType];
        send([connectionId, FRAME.CLOSED, code]);
        outConnections[connectionId].close();
        delete outConnections[connectionId];
      };
    };
    var dispatchFrame = {
      open: function (connectionId, host, port) {
        debug('OPEN FRAME');
        assert(!(connectionId in outConnections), 'OPEN frame for existing connection');
        assert(host && port, 'Invalid host or port');
        var outConn = outConnections[connectionId] = node.tcp.createConnection(port, host);
        outConn.setEncoding('raw');
        outConn
          .addListener('connect', function () {
            send([connectionId, FRAME.OPENED]);
          })
          .addListener('receive', function (data) {
            send([connectionId, FRAME.DATA, raw_to_bytes(data)]);
          })
          .addListener('eof', function () {
            closeOutgoing(connectionId, 'RemoteConnectionClosed');
          })
          .addListener('disconnect', function (had_error) {
            closeOutgoing(connectionId, 'RemoteConnectionClosed');
          });
      },
      close: function (connectionId) {
        debug('CLOSE FRAME')
        closeOutgoing(connectionId, 'UserConnectionReset');
      },
      data: function (connectionId, data) {
        debug('DATA FRAME')
        data = bytes_to_raw(unescape(data))
        outConnections[connectionId].send(data, 'raw');
      },
    };
  };
  msp.Proxy = function () {
    var self = this;
    self.cspserver = csp.createServer(function(connection) {
      debug('got connection')
      proxyConnection = new msp.ProxyConnection(connection);
    });
    self.listen = function (port, host) {
      self.cspserver.listen(port, host);
    };
  };
})();

function start_server () {
  var server = new msp.Proxy();
  server.listen(8050);
};
start_server();