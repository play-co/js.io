jsio.bind = function(context, method/*, arg1, arg2, ... */){
    var args = Array.prototype.slice.call(arguments, 2);
    return function(){
        method = (typeof method == 'string' ? context[method] : method);
        var invocationArgs = Array.prototype.slice.call(arguments, 0);
        return method.apply(context, args.concat(invocationArgs))
    }
}

jsio.Class = function(parent, proto) {
	if(!parent) { throw new Exception('parent or prototype not provided'); }
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

jsio.declare = function(name, parent, proto) {
    var obj;
    if (typeof(window) != "undefined") {
        obj = window;
    }
    else if(typeof(process) != "undefined") {
        obj = process;
    }
    var segments = name.split('.');
    for (var i = 0; i < segments.length -1; ++i) {
        var segment = segments[i];
        if (!obj[segment]) {
            obj[segment] = {}
        }
        obj = obj[segment]
    }
    obj[segments[segments.length-1]] = jsio.Class(parent, proto);
}


jsio.Singleton = function(proto, parent) {
    return new (jsio.Class(proto, parent))();
};

