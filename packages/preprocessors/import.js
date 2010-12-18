var importExpr = /^(\s*)(import\s+.*|from\s+.*)$/gm;

exports = function(path, moduleDef, opts) {
	moduleDef.src = moduleDef.src.replace(importExpr, '$1' + 'jsio' + '("$2");');
}
