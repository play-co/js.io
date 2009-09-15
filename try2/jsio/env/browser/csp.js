require('jsio', ['Class', 'bind']);
require('jsio.logging');
require('jsio.interfaces');
require('jsio.csp.client', 'CometSession');

var logger = jsio.logging.getLogger('env.browser.csp')

exports.Connector = Class(jsio.interfaces.Connector, function() {
    this.connect = function() {
        logger.debug('create Orbited.TCPSocket');
        var conn = new CometSession();
        conn.onopen = bind(this, function() {
            logger.debug('conn has opened');
            this.onConnect(new Transport(conn));
        });
        conn.onclose = bind(this, function(code) {
            logger.debug('conn closed without opening, code:', code);
        })
        logger.debug('open the conection');
        conn.conn(this._opts.url);
    }
});

var Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(conn) {
        this._conn = conn;
    }
    
    this.makeConnection = function(protocol) {
        this._conn.onread = bind(protocol, 'dataReceived');
        this._conn.onclose = bind(protocol, 'connectionLost'); // TODO: map error codes
    }
    
    this.write = function(data, encoding) {
        this._conn.send(data);
    }
    
    this.loseConnection = function(protocol) {
        this._conn.close();
    }
});
