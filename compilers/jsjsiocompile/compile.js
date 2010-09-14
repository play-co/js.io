var sys = require('sys'),
	jsioPath = process.argv[2];

require(jsioPath + '/jsio');

var initial = process.argv[3];
if (!initial) {
	sys.print("pass in the initial import of the project\n\n");
	sys.exit();
}

// We don't run jsio.js through the compiler which is
// where base.js normally gets imported.
compiler = jsio('import preprocessors.compiler');
compiler.compile('import base');
compiler.compile('import ' + initial, {
	autoDetectPaths: true,
	dynamicImports: {
		ENV: null
	}
});

sys.print(compiler.buildResult());

