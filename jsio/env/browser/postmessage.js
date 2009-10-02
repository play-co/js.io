jsio('import Class, log, bind, jsio.interfaces');
jsio('from jsio.util.browser import $');

exports.Listener = Class(jsio.interfaces.Listener, function(supr) {
    var ID = 0;
    
    this.init = function() {
        supr(this, 'init', arguments);
        this._clients = {};
        if (!this._opts.clientUrl) {
            console.log(require.__dir);
            this._opts.clientUrl = require.__dir + '/networkConsole.html';
        }
    }
    
    this.listen = function() {
        $.onEvent(window, 'message', bind(this, '_onMessage'));
        this._button = document.createElement('a');
        $.style(this._button, {display: 'inline-block', border: '1px solid #CCC', background: '#EEE'});
        this._button.innerHTML = 'new client';
        console.log('opts', this._opts);
        $.onEvent(this._button, 'click', bind(this, function() {
            window.open(this._opts.clientUrl, 'W' + (ID++));
        }));
    }
    
    this.getButton = function() { return this._button; }
    
    this._onMessage = function(evt) {
        log("SERVER RECEIVED", evt.data)
        var name = evt.source.name;
        var target = this._clients[name];
        var data = eval('(' + evt.data + ')');
        switch (data.type) {
            case 'open':
                log('connection opened');
                this._clients[name] = new exports.Transport(evt.source);
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

exports.Connector = Class(jsio.interfaces.Connector, function() {
    this.connect = function() {
        $.onEvent(window, 'message', bind(this, '_onMessage'));
        window.opener.postMessage(JSON.stringify({type:"open"}), '*');
    }
    
    this._onMessage = function(evt) {
        log("CLIENT RECEIVED", evt.data)
        var data = eval('(' + evt.data + ')');
        switch(data.type) {
            case 'open':
                log('CLIENT connection opened');
                this._transport = new exports.Transport(evt.source);
                this.onConnect(this._transport);
                break;
            case 'close':
                log('CLIENT connection closed');
                this._transport.onClose();
                break;
            case 'data':
                log('CLIENT data received:', data.payload);
                this._transport.onData(data.payload);
                break;
        }
    }
});

exports.Transport = Class(jsio.interfaces.Transport, function() {
    this.init = function(win) {
        this._win = win;
    }
    
    this.makeConnection = function(protocol) {
        this._protocol = protocol;
    }
    
    this.write = function(data, encoding) {
        console.log('write', data);
        this._win.postMessage(JSON.stringify({type: 'data', payload: data}), '*');
    }
    
    this.loseConnection = function(protocol) {
        this._win.postMessage(JSON.stringify({type: 'close', code: 301}), '*');
    }
    
    this.onData = function() { this._protocol.dataReceived.apply(this._protocol, arguments); }
    this.onClose = function() { this._protocol.connectionLost.apply(this._protocol, arguments); }
});
