var logExpr = /^\s*logger\.(log|warn|error|debug|info).*$/gm;

exports = function (path, moduleDef, opts) {
	moduleDef.src = moduleDef.src.replace(logExpr, '');
}
