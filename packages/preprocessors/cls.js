var classExport = /^(.*?)exports\s*=\s*Class\(/gm;
var class2Export = /var\s*([a-zA-Z0-9$]+)\s*=\s*Class\(/;

exports = function(path, moduleDef, opts) {
	var moduleCtor = moduleDef.path.replace(/(^[.\/]+|\.([^.]+?)$)/g, '').replace(/[\/.]/g, '_');
	moduleDef.src = moduleDef.src
		.replace(class2Export, 'var $1=Class;$1=$1(')
		.replace(classExport, 'var ' + moduleCtor + '=Class;$1exports=' + moduleCtor + '(')
}
