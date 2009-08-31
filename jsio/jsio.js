(function() {

jsio = {}

var root = '.'

if (typeof(node) != 'undefined' && node.version) {
    jsio.log = function() {
        node.debug([].slice.call(arguments, 0).join(' '));

//        node.debug(new Array(arguments).join(' '));
    }
    var ls = node.createChildProcess("pwd");
    ls.addListener("output", function (data) {
        node.debug('got output:' + data);
        if (data) {
            root += data;
        }
    })

}
else {
    jsio.log = function() {
		if (typeof console != 'undefined' && console.log) {
			console.log.apply(console, arguments);
		}
	}
}

jsio.exports = function() {
    
}

var getServerEnvironment = function() {
    return typeof(node) != 'undefined' ? 'node' : 'browser';
}

var getEnvironment = function() {
    return getServerEnvironment();
}


jsio.require = function(path) {
    // XXX: Maybe we should keep track of all path's included in an object
    //      and use that to do our "already loaded" checking... With the current
    //      implementation if you include a class, but not a module, then later
    //      include the module, it will think the module is already included.
    var subPaths = path.split('.')
	var parent = window;
	var found = true;
	for(var i = 0, part; part = subPaths[i]; ++i) {
		if(!window[part]) {
			found = false;
			break;
		}
	}
	if(found) { return; }
    var lastSegment = subPaths[subPaths.length-1];
    var firstLetter = lastSegment.slice(0,1)
    var path = null;
    if (firstLetter == firstLetter.toUpperCase()) {
        subPaths[subPaths.length-1] += '.js'
        // file
    }
    else {
        //module
        subPaths.push(subPaths[subPaths.length-1] + '.js')
    }
    switch(getEnvironment()) {
        case 'node':
            subPaths.splice(0,0, [node.fs.cwd()])
            var path = node.path.join.apply(this, subPaths);
            include(path);
            break;
        case 'browser':
            // ...
            path = subPaths.join("/")
            var xhr = new XMLHttpRequest()
            xhr.open('GET', path, false);
            xhr.send(null);
            eval(xhr.responseText);
            break;
    }
}

jsio.require('jsio.base');
jsio.require('jsio.interfaces');

jsio.quickServer = function(protocolClass) {
    return new jsio.Server(protocolClass);
}

var getClientEnvironment = function() {
	var match = window.location.search.substring(1).match('^(.*&)?protocol=([^&]*)');
	if (match && match[2] == 'postMessage') {
		return 'browser';
	}
	
    if (window && window.Orbited) {
        return 'orbited';
    }
    if (window && window.socket) {
        return 'socket';
    }
    if (false) {
        return 'node';
    }
}

jsio.declare('jsio.env.node.tcp.Listener', jsio.interfaces.Listener, function(supr) {
	this.listen = function() {
    	var s = node.tcp.createServer(jsio.bind(this, function(socket) {
		    socket.setEncoding("utf8");
		    socket.addListener("connect", jsio.bind(this, function() {
           		this.onConnect(new jsio.env.node.tcp.Transport(socket));
   			}));
   		}));
        s.listen(this._opts.port, this._opts.interface || "");
	}
});

jsio.declare('jsio.env.browser.postMessage.Listener', jsio.interfaces.Listener, function(supr) {
	var ID = 0;
	
	this.init = function() {
		supr(this, 'init', arguments);
		
		this._clients = {};
	}

	this.listen = function() {
		jsio.browser.connect(window, 'message', jsio.bind(this, '_onMessage'));
		this._button = document.createElement('a');
		jsio.browser.style(this._button, {display: 'inline-block', border: '1px solid #CCC', background: '#EEE'});
		this._button.innerHTML = 'new client';
		jsio.browser.connect(this._button, 'click', jsio.bind(this, function() {
			window.open(this._opts.client, 'W' + (ID++));
		}));
	}
	
	this.getButton = function() { return this._button; }
	
	this._onMessage = function(evt) {
		console.log("SERVER RECEIVED", evt.data)
		var name = evt.source.name;
		var target = this._clients[name];
		var data = eval('(' + evt.data + ')');
		switch (data.type) {
			case 'open':
				jsio.log('connection opened');
				this._clients[name] = new jsio.env.browser.postMessage.Transport(evt.source);
				evt.source.postMessage('{type:"open"}','*');
				this.onConnect(this._clients[name]);
				break;
			case 'data':
				target.onData(data.payload);
				break;
			case 'close':
				target.onClose();
				evt.source.postMessage('{type:"close"}','*');
				delete this._clients[name];
				break;
		}
	}
});

jsio.listen = function(server, protocol, opts) {
	var env = jsio.env[getServerEnvironment()];
	if(!env[protocol] || !env[protocol].Listener) throw new Error('No listener found for ' + protocol + ' in ' + getServerEnvironment());
	var listener = new env[protocol].Listener(server, opts);
	listener.listen();
	return listener;
}

jsio.connect = function(protocolClass, protocol, opts) {
	var env = jsio.env[getClientEnvironment()];
	if(!env[protocol] || !env[protocol].Connector) throw new Error('No connector found for ' + protocol + ' in ' + getClientEnvironment());
	var connector = new env[protocol].Connector(protocolClass, opts);
	connector.connect();
	return connector;
}

jsio.declare('jsio.env.orbited.tcp.Connector', jsio.interfaces.Connector, function() {
	this.connect = function() {
        var conn = new Orbited.TCPSocket();
        conn.onopen = jsio.bind(this, function() {
        	this.onConnect(new jsio.env.orbited.tcp.Transport(conn));
        });
        conn.open(this._opts.host, this._opts.port);
	}
});

jsio.declare('jsio.env.browser.postMessage.Connector', jsio.interfaces.Connector, function() {
	jsio.require('jsio.browser');

	this.connect = function() {
		jsio.browser.connect(window, 'message', jsio.bind(this, '_onMessage'));
		window.opener.postMessage(JSON.stringify({type:"open"}), '*');
	}
	
	this._onMessage = function(evt) {
		console.log("CLIENT RECEIVED", evt.data)
		var data = eval('(' + evt.data + ')');
		switch(data.type) {
			case 'open':
				jsio.log('CLIENT connection opened');
				this._transport = new jsio.env.browser.postMessage.Transport(evt.source);
				this.onConnect(this._transport);
				break;
			case 'close':
				jsio.log('CLIENT connection closed');
				this._transport.onClose();
				break;
			case 'data':
				jsio.log('CLIENT data received:', data.payload);
				this._transport.onData(data.payload);
				break;
		}
	}
});

jsio.declare('jsio.env.browser.postMessage.Transport', jsio.interfaces.Transport, function() {
	this.init = function(win) {
		this._win = win;
	}
	
	this.makeConnection = function(protocol) {
		this._protocol = protocol;
	}
	
	this.write = function(data, encoding) {
		this._win.postMessage(JSON.stringify({type: 'data', payload: data}), '*');
	}
	
	this.loseConnection = function(protocol) {
		this._win.postMessage(JSON.stringify({type: 'close', code: 301}), '*');
	}
	
	this.onData = function() { this._protocol.dataReceived.apply(this._protocol, arguments); }
	this.onClose = function() { this._protocol.connectionLost.apply(this._protocol, arguments); }
});

jsio.declare('jsio.env.orbited.tcp.Transport', jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    };
    
    this.makeConnection = function(protocol) {
        this._socket.onread = jsio.bind(protocol, 'dataReceived');
        this._socket.onclose = jsio.bind(protocol, 'connectionLost'); // TODO: map error codes
    }
    
    this.write = function(data, encoding) {
        this._socket.send(data);
    };

    this.loseConnection = function() {
        this._socket.close();
    };

});

jsio.declare('jsio.env.node.tcp.Transport', jsio.interfaces.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    }

    this.makeConnection = function(protocol) {
		this._socket.addListener("receive", jsio.bind(protocol, 'dataReceived'));
		this._socket.addListener("close", jsio.bind(protocol, 'connectionLost')); // TODO: map error codes
    }

    this.write = function(data) {
        this._socket.send(data);
    }

    this.loseConnection = function() {
        this._socket.forceClose();
    }

})


/*
tcp.listen(jsio.quickServer(Protocol), 8000);
tcp.connect(Protocol, "localhost", 8000);
*/

})();
