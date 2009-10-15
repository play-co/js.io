jsio('import Class, bind, jsio.logging, jsio.interfaces');
jsio('from jsio.csp.client import CometSession');

var logger = jsio.logging.getLogger('env.browser.csp');

exports.Connector = Class(jsio.interfaces.Connector, function() {
    this.connect = function() {
        var conn = new CometSession();
        conn.onconnect = bind(this, function() {
            logger.debug('conn has opened');
            this.onConnect(new Transport(conn));
        });
        conn.ondisconnect = bind(this, function(code) {
            logger.debug('conn closed without opening, code:', code);
        });
        logger.debug('open the conection');
        conn.connect(this._opts.url, {encoding: 'plain'});
    }
});

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(conn) {
        this._conn = conn;
    }
    
    this.makeConnection = function(protocol) {
        this._conn.onread = bind(protocol, 'dataReceived');
        this._conn.ondisconnect = bind(protocol, 'connectionLost'); // TODO: map error codes
    }
	
    this.write = function(data, encoding) {
        this._conn.write(data);
    }
    
    this.loseConnection = function(protocol) {
        this._conn.close();
    }
});
