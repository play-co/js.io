var importExpr = /^(\s*)(import\s+.*|from\s+.*)$/gm;

function replace(match) {
	if (!/\/\//.test(match[1])) {
		return match[1] + 'jsio' + match[2]
	}
	return match[0];
}

exports = function(path, moduleDef, opts) {
	moduleDef.src = moduleDef.src.replace(importExpr, '$1' + 'jsio' + '("$2");');
}
