var sys = require('sys'),
	jsioPath = (process.argv[2] ? process.argv[2] : './jsio');

require(jsioPath + '/jsio');

jsio('import .compiler').start();
