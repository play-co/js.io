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
jsio('from .util import *');
jsio('from .server import csp')

// msp = "Multiplexing Socket Proxy"
var msp = this.msp = exports;

;(function () {

var frameTypes = ['open', 'close', 'data'];
var FRAME_OPENED = 0, FRAME_CLOSED = 1, FRAME_DATA = 2;
var errorCodes = {
	InvalidHandshake: 102,
	UserConnectionReset: 103,
	RemoteConnectionTimeout: 104,
	Unauthorized: 106,
	RemoteConnectionFailed: 108,
	RemoteConnectionClosed: 109,
	ProtocolError: 110
};
msp.ProxyConnection = Class(function() {
	this.init = function (inConnection) {
		this.inConnection = inConnection;
		this.inBuffer = '';
		this.outConnections = {};
		this.inConnection
			.addListener('receive', bind(this, this.receiveData))
			.addListener('eof', bind(this, this.shutdown))
			.addListener('disconnect', bind(this, this.shutdown))
			.setEncoding('bytes');	
	};
	this.receiveData = function (data) {
		var frameBegin;
		this.inBuffer += data;
		try {
			while ((frameBegin = this.inBuffer.indexOf('[')) != -1) {
				var frameEnd = parseInt(this.inBuffer.slice(0, frameBegin)) + frameBegin;
				assert (!isNaN(frameEnd), 'Invalid frame size prefix');
				if (this.inBuffer.length < frameEnd) {
					break; // whole frame hasn't arrived yet
				}
				var frame = JSON.parse(this.inBuffer.slice(frameBegin, frameEnd));
				this.inBuffer = this.inBuffer.slice(frameEnd) // remove frame from buffer
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
			this.shutdown(true);
		};
	};
	this.shutdown = function (had_error) {
		// close all outgoing TCP connections			 
		for (var connectionId in this.outConnections) {
			if (had_error) {
				this.closeOutgoing(connectionId, 'ProtocolError');
			} else {
				this.closeOutgoing(connectionId, 'UserConnectionReset');
			}
			// ???? this is not valid JS
			// var outConn = this.outConnections[connectionId];
			// outConn.listeners('connect') = [];
			// outConn.listeners('receive') = [];
			// outConn.listeners('eof') = [];
			// outConn.listeners('disconnect') = [];
		};
	};
	this.send = function (frame) {
		payload = JSON.stringify(frame);
		this.inConnection.send(payload.length + ',' + payload, 'bytes');
	};
	this.closeOutgoing = function (connectionId, errorType) {
		if (connectionId in this.outConnections) {
			var code = errorCodes[errorType];
			this.send([connectionId, FRAME_CLOSED, code]);
			this.outConnections[connectionId].close();
			delete this.outConnections[connectionId];
		};
	};
	this.dispatchFrame = {
		open: function (connectionId, host, port) {
			assert(!(connectionId in this.outConnections), 'OPEN frame for existing connection');
			assert(host && port, 'Invalid host or port');
			var outConn = this.outConnections[connectionId] = node.tcp.createConnection(port, host);
			outConn.setEncoding('bytes');
			outConn
				.addListener('connect', function () {
					this.send([connectionId, FRAME_OPENED]);
				})
				.addListener('receive', function (data) {
					this.send([connectionId, FRAME_DATA, data]);
				})
				.addListener('eof', function () {
					this.closeOutgoing(connectionId, 'RemoteConnectionClosed');
				})
				.addListener('disconnect', function (had_error) {
					this.closeOutgoing(connectionId, 'RemoteConnectionClosed');
				});
		},
		close: function (connectionId) {
			this.closeOutgoing(connectionId, 'UserConnectionReset');
		},
		data: function (connectionId, data) {
			data = unescape(data);
			this.outConnections[connectionId].send(data, 'bytes');
		}
	};	
});

msp.Proxy = Class(function () {
	this.init = function () {
		this.cspserver = csp.createServer(function(connection) {
			proxyConnection = new msp.ProxyConnection(connection);
		});
	};
	this.listen = function (port, host) {
		this.cspserver.listen(port, host);
	};
});

})(); // end closure w/ code for msp

function start_server () {
	var server = new msp.Proxy();
	server.listen(8050);
	log("Proxying from http://:8050");
};
start_server();