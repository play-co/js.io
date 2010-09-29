var sys = require('sys'),
	jsioPath = (process.argv[2] ? process.argv[2] : './jsio');

process.argv.splice(2, 1);

require(jsioPath + '/jsio');

var pathStat = jsio.__util.splitPath(__filename),
	path = jsio.__util.makeRelativePath(pathStat.directory, process.cwd());

jsio.addPath(path);
var compiler = jsio('import compiler');
jsio.removePath(path);

compiler.start();
