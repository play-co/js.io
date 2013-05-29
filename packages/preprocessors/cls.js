
// var F = exports = Class
// exports = Class
var classExport = /^(.*?)exports[ \t]*=[ \t]*Class\(/gm;

// var F = Class
// exports.F = Class
// var F = exports.F = Class
var class2Export = /^(.*?[ \t]+)?([a-zA-Z0-9\.$]+)[ \t]*=[ \t]*Class\(/gm;

function replacer(base, prefix, name) {
	if (/\/\//.test(base)) {
		return base;
	}
	return name + '=__class__;' + (prefix || '') + name + '=' + name + '(function ' + name.replace(/[\.]/g, '_') + '(){return this.init&&this.init.apply(this,arguments)},';
}

exports = function(path, moduleDef, opts) {
	var moduleCtor = moduleDef.path.replace(/(^[.\/]+|\.([^.]+?)$)/g, '').replace(/[\:\\\/\-\.]/g, '_');
	moduleDef.src = moduleDef.src
		.replace(classExport, 'var ' + moduleCtor + '=__class__;$1exports=' + moduleCtor + '(function ' + moduleCtor + '(){return this.init&&this.init.apply(this,arguments)},')
		.replace(class2Export, replacer);
}
