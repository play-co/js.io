jsio('import lib.LogClass')
jsio('import .Base');

exports = lib.LogClass('Importer', Base, function(logger) {
	var importExpr = /^\s*(import\s+|from\s+).*$/gm;
	
	this.run = function(src) {
		return src.replace(importExpr, 'jsio("$&");');
	}
});
