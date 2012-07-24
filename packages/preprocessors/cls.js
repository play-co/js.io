var classExport = /^(.*?)exports\s*=\s*Class\(/gm;
var class2Export = /(^|\s+)([a-zA-Z0-9\.$]+)\s*=\s*Class\(/gm;

function replacer(base, prefix, name) {
	return prefix + name + '=__class__(function ' + name.replace(/\./g, '_') + '(){return this.init&&this.init.apply(this,arguments)},';
}

exports = function(path, moduleDef, opts) {
	var moduleCtor = moduleDef.path.replace(/(^[.\/]+|\.([^.]+?)$)/g, '').replace(/[\/.]/g, '_');
	moduleDef.src = moduleDef.src
		.replace(classExport, '$1exports=__class__(function ' + moduleCtor + '(){return this.init&&this.init.apply(this,arguments)},')
		.replace(class2Export, replacer);
}
