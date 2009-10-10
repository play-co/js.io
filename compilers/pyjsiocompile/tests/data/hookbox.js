jsio('import bind, Class');
jsio('from jsio import connect as jsioConnect');
jsio('from jsio.protocols.rtjp import RTJPProtocol');
jsio('import jsio.logging');

var logger = jsio.logging.getLogger('hookbox');

exports.logging = jsio.logging

exports.connect = function(url, cookieString) {
    var p = new HookBoxProtocol(url, cookieString);
    jsioConnect(p, 'csp', {url: url})
    return p;
}

var Subscription = Class(function(supr) {
    // Public API

    this.init = function(destination, errorId) {
        this.destination = destination;
        this.canceled = false;
        this._errorId = errorId
    }

    this.onPublish = function(frame) { }
    this.onSetup = function(frame) { }
    this.onFailure = function(frame) { }

    this.getDestination = function() {
        return this.destination;
    }

    this.cancel = function() {
        if (!this.canceled) {
            this.canceled = false;
            logger.debug('calling this._onCancel()');
            this._onCancel();
        }
    }


    // Private API
    this._onCancel = function() { }


})

HookBoxProtocol = Class([RTJPProtocol], function(supr) {
    // Public api
    this.onopen = function() { }
    this.onclose = function() { }
    this.onerror = function() { }

    this.init = function(url, cookieString) {
        supr(this, 'init', []);
        this.url = url;
        this.cookieString = cookieString || document.cookie;
        this.connected = false;
        this._subscriptions = {}
        this._publishes = []
        this._errors = {}
    }

    this.subscribe = function(channel_name) {
        var s = new Subscription();
        var subscribers;
        s._onCancel = bind(this, function() {
            logger.debug('in this._onCancel');
            var i = subscribers.indexOf(s);
            subscribers.splice(i, 1);
            if (!subscribers.length) {
                // NOTE: Its possible for hookbox to refuse the unsubscribe.
                //       Then where would we be? I guess its not a common use
                //       case though.
                //       -mcarter 10/2/09
                delete this._subscriptions[channel_name];
                delete this._errors[fId];
                this.sendFrame('UNSUBSCRIBE', {channel_name: channel_name});
            }
            delete s._onCancel;
        })
        if (subscribers = this._subscriptions[channel_name]) {
            subscribers.push(s);
        } else {
            subscribers = [ s ];
            this._subscriptions[channel_name] = subscribers;
            if (this.connected) {
                var fId = this.sendFrame('SUBSCRIBE', {channel_name: channel_name});
                this._errors[fId] = subscribers;
            }
        }

        return s;
    }

    this.publish = function(channel_name, data) {
        if (this.connected) {
            this.sendFrame('PUBLISH', { channel_name: channel_name, payload: JSON.stringify(data) });
        } else {
            this._publishes.push([channel_name, data]);
        }

    }

    this.connectionMade = function() {
        logger.debug('connectionMade');
        this.sendFrame('CONNECT', { cookie_string: this.cookieString });
    }

    this.frameReceived = function(fId, fName, fArgs) {
        switch(fName) {
            case 'CONNECTED':
                this.connected = true;
                for (key in this._subscriptions) {
                    var fId = this.sendFrame('SUBSCRIBE', {channel_name: key});
                    this._errors[fId] = this._subscriptions[key];
                }
                while (this._publishes.length) {
                    var pub = this._publishes.splice(0, 1)[0];
                    this.publish.apply(this, pub);
                }
		console.log(fName);
		console.log(fArgs);
                this.onopen(fArgs);
                break;
            case 'PUBLISH':
                var subscribers;
                if (subscribers = this._subscriptions[fArgs.channel_name]) {
                    for (var i = 0, subscriber; subscriber = subscribers[i]; ++i) {
                        try {
                            subscriber.onFrame(fArgs);
                        } catch(e) {
                            setTimeout(function() { throw e; }, 0);
                        }
                    }
                }
                break;
            case 'ERROR':
                if (subs = this._errors[fArgs.reference_id]) {
                    for (var i = 0, sub; sub=subs[i]; ++i) {
                        sub.cancel()
                        sub.onFailure(fArgs.msg);
                    }
                } else {
                    this.onerror(fArgs);
                }
                break;
	    case 'CHANNEL_INIT':
	        console.log("init args" + fArgs.toString());
	        var subscribers = this._subscriptions[fArgs.channel_name];
		for (var i = 0, subscriber;
		     subscriber = subscribers[i]; ++i) {
                    try {
                        subscriber.onInit(fArgs);
                    } catch(e) {
                        setTimeout(function() { throw e; }, 0);
                    }
                }
	        break;
	    default:
	        console.log(fName);
	        console.log(fArgs);
        }
    }
    this.connectionLost = function() {
        logger.debug('connectionLost');
        this.connected = false;
        this.onclose();
    }

    // TODO: we need another var besides this.connnected, as that becomes true
    //       only after we get a CONNECTED frame. Maybe our transport is
    //       connected, but we haven't gotten the frame yet. For now, no one
    //       should be calling this anyway until they get an onclose.

    this.reconnect = function() {
        jsioConnect(this, this.url);
    }

})