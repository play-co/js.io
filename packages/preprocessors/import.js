var importExpr = /^(\s*)(import\s+[^=+*"'\r\n;\/]+|from\s+[^=+"'\r\n;\/]+)(;|\/|$)/gm;

function replace(raw, p1, p2, p3) {
	if (!/\/\//.test(p1)) {
		return p1 + 'jsio("' + p2 + '")' + p3;
	}
	return raw;
}

exports = function (path, moduleDef, opts) {
	moduleDef.src = moduleDef.src.replace(importExpr, replace);
}
