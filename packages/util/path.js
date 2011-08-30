var util = jsio.__jsio.__util;

exports.join = util.buildPath;
exports.resolveRelativePath = util.resolveRelativePath;
exports.splitPath = util.splitPath;
exports.makeRelativePath = util.makeRelativePath;
exports.splitExt = function(path) {
	var res = exports.splitPath(path);
	var i = res.filename.lastIndexOf('.');
	if (i == -1) {
		res.basename = res.filename;
		res.ext = '';
	} else {
		res.basename = res.filename.substring(0, i);
		res.ext = res.filename.substring(i);
	}
	return res;
}