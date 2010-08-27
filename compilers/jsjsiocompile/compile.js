var sys = require('sys'),
	cwd = process.cwd();

function endWithSlash(str) {
	if (!/\/$/.test(str)) { str += '/'; }
	return str;
}

var jsioPath = process.argv[2];
require(endWithSlash(cwd) + endWithSlash(jsioPath) + 'jsio');

var initial = process.argv[3];
if (!initial) {
	sys.print("pass in the initial import of the project\n\n");
	sys.exit();
}

jsio(initial, {preprocessors:['compiler'],dynamicImports:{ENV:'import .env.browser.csp'}});

// we need to special case base since we don't process jsio.js using the compiler preprocessor
compiler = jsio('import preprocessors.compiler');
baseModule = {path:'base',filePath:jsio.__baseFile,src:jsio.__env.fetch(jsio.__baseFile)};
compiler('base', baseModule);
compiler.output();

