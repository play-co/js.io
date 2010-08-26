var importExpr = /^(\s*)(import\s+.*|from\s+.*)$/gm;

exports = function(src) {
	return src.replace(importExpr, '$1jsio("$2");');
}
