
// var F = exports = Class
// exports = Class
var classExport = /^(.*?)exports\s*=\s*Class\s*\(/gm;

// var F = Class
// exports.F = Class
// var F = exports.F = Class
var class2Export = /^(\s*)(.*?[ \t]+)?([a-zA-Z0-9\.$]+)\s*=\s*Class\s*\(/gm;

function replacer (base, whitespace, prefix, name) {
	if (/\/\//.test(base)) {
		return base;
	}

	return whitespace + name + '=__class__;' + (prefix || '') + name + '=' + name + '(function ' + name.replace(/[\.]/g, '_') + '(){return this.init&&this.init.apply(this,arguments)},';
}

exports = function (path, moduleDef, opts) {
	var moduleCtor = moduleDef.path.replace(/(^[.\/]+|\.([^.]+?)$)/g, '').replace(/[\:\\\/\-\. ]/g, '_');
	moduleDef.src = moduleDef.src
		.replace(classExport, 'var ' + moduleCtor + '=__class__;$1exports=' + moduleCtor + '(function ' + moduleCtor + '(){return this.init&&this.init.apply(this,arguments)},')
		.replace(class2Export, replacer);
}
