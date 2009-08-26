(function() {


jsio = {}

jsio.bind = function(context, method/*, arg1, arg2, ... */){
    var args = Array.prototype.slice.call(arguments, 2);
    return function(){
        method = (typeof method == 'string' ? context[method] : method);
        var invocationArgs = Array.prototype.slice.call(arguments, 0);
        return method.apply(context, args.concat(invocationArgs))
    }
}

jsio.Class = function(parent, proto) {
    if(!proto) { proto = parent; } 
    else { proto.prototype = parent.prototype; }    
    var cls = function() {
        if(this.init) {
            this.init.apply(this, arguments);
        }
    }
    cls.prototype = new proto(function(context, method, args) {
        var args = args || [];
        while(parent = parent.prototype) {
            if(parent[method]) {
                return parent[method].apply(context, args);
            }
        }
        throw new Exception('method ' + method + ' does not exist');
    });
    cls.constructor = cls;
    return cls;
};

jsio.Singleton = function(proto, parent) {
    return new (jsio.Class(proto, parent))();
};


// Sort of like a twisted protocol

jsio.Protocol = jsio.Class(function() {

    this.connectionMade = function() {
        throw new Error("Not implemented");
    }
    this.dataReceived = function(data) {
        throw new Error("Not implemented");
    }

    this.connectionLost = function(reason) {
        throw new Error("Not implemented");
    }
});




// Sort of like a twisted factory
jsio.Server = jsio.Class(function() {
    this.what = 'hey';
    this.init = function(protocolClass) {
        this._protocolClass = protocolClass;
    }

    this.connectionMade = function(transport) {
        var p = this.buildProtocol()
        p.server = this;
        transport.makeConnection(p);
    }

    this.buildProtocol = function() {
        return new this._protocolClass();
    }
    
    this.toString = function() {
        return "<jsio.Server >";
    }

})

jsio.quickServer = function(protocolClass) {
    return new jsio.Server(protocolClass);
    
}



var getClientEnvironment = function() {
    if (window && window.Orbited) {
        return 'Orbited';
    }
    if (window && window.socket) {
        return 'socket';
    }
    if (false) {
        return 'node';
    }
}
var getServerEnvironment = function() {
    return 'node';
}




jsio.listenTCP = function(server, port, opts) {
    var interface = (opts && opts.interface) || ""
    // Figure out what our server-side api is.
    var env = getServerEnvironment();

    switch(env) {
        case 'node':
            function transport(socket) {
                socket.setEncoding("utf8");
                socket.addListener("connect", jsio.bind(this, function() {
                    var transport = new jsio.transport.NodeTCPTransport(socket);
                    server.connectionMade(transport);
                }))
            }
            var s = node.tcp.createServer(transport);
            s.listen(port, interface);
            // Create a node server.
            break;
        default:
            throw new Error("unrecognized javascript server environment");
            break;
    }
}

jsio.connectTCP = function(protocol, hostname, port) {
    var env = getClientEnvironment();
    switch(env) {
        case 'node':
            // Make a tcp connection, create a new protocol instance, call makeConnection
            throw new Error("node client not implemented");
            break;
        case 'Orbited':
            var conn = new Orbited.TCPSocket();
            p = new protocol();
            var transport = new jsio.transport.TCPSocketTransport(conn, p);
            conn.open(hostname, port);                
            break;
        case 'socket':
            throw new Error("socket.js client not implemented");
            break;
        default:
            throw new Error("unrecognized javascript client environment");
    }
}

jsio.transport = {};

jsio.transport.Transport = jsio.Class(function() {
    this.write = function(data, encoding) {
        throw new Error("Not implemented");
    }
    this.getPeer = function() {
        throw new Error("Not implemented");
    }
});

jsio.transport.TCPSocketTransport = jsio.Class(jsio.transport.Transport, function() {
    this.init = function(socket, protocol) {
        this._socket = socket;
        this._protocol = protocol;
        this._socket.onopen = jsio.bind(this, function() {
            this.makeConnection(this._protocol);
        });
        this._socket.onclose = jsio.bind(this, function(code) {
            this._protocol.connectionLost(code);
        });
        this._socket.onread = jsio.bind(this, function(data) {
            this._protocol.dataReceived(data);
        });
    };
    this.makeConnection = function(protocol) {
        protocol.transport = this;
        protocol.connectionMade();
    }

    this.loseConnection = function() {
        this._socket.close();
    };

    this.write = function(data, encoding) {
        this._socket.send(data);
    };

});

jsio.transport.NodeTCPTransport = jsio.Class(jsio.transport.Transport, function() {
    this.init = function(socket) {
        this._socket = socket;
    }

    this.makeConnection = function(protocol) {
        this._socket.addListener("receive", jsio.bind(this, function(data) {
            protocol.dataReceived(data);
        }));

        this._socket.addListener("close", jsio.bind(this, function(had_error) {
            protocol.connectionLost(had_error);
        }));
        protocol.transport = this;
        protocol.connectionMade();
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