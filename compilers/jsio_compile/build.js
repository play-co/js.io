/** run "node build.js" to generate the jsjsiocompiler **/

var TARGET = 'build/jsio_compile';

var sys = require('sys'),
	fs = require('fs'),
	node = process.argv[0];

require('./jsio/jsio');

// setup logging
jsio('from base import *');
logger = logging.get('compiler');
logging.get('preprocessors.compiler').setLevel(0);

// get access to jsio path util functions
jsio('import util.path');

try {
	var buildDir = fs.statSync('build');
} catch(e) {
	// seems like errno 2 is a 'does not exist' error
	if (e.errno != 2) { throw e; }
}

if (!buildDir || !buildDir.isDirectory()) {
	fs.mkdirSync('build', 0777);
}

var compiler = jsio('import preprocessors.compiler');

var interface = jsio('import .node_interface');
compiler.setCompressor(interface.compressor);

compiler.compile('import preprocessors.compiler');
compiler.compile('import .compiler', {
	dynamicImports: {
		COMPILER: 'import .node_interface'
	}
});

// grab a full copy of jsio
walk('jsio', function(path, files, dirs) {
	files.forEach(function(file) {
		if (/\.js$/.test(file)) {
			var module = file.replace(/^jsio\//, '').replace(/\.js$/, '').replace(/\//g, '.');
			if (module != 'jsio') {
				compiler.compile('import ' + module);
			}
		}
	});
});


var exec = require('child_process').exec;

exec("which " + node, function(error, stdout, stderr) {
	var nodeLocation = stdout.replace(/\n/g, '');
	logger.info('Found node at', nodeLocation)
	exec(nodeLocation + " --version", function(error, stdout, stderr) {
		var nodeVersion = stdout.replace(/\n/g, '');;
		logger.info('Using node version', nodeVersion);
		compiler.generateSrc({compressJsio: true, dontModifyJsio: true}, function(src) {
			var fd = fs.openSync(TARGET, 'w');
			fs.writeSync(fd, '#!' + nodeLocation + '\n');
			fs.writeSync(fd, src);
			fs.writeSync(fd, 'jsio("import .compiler").start()');
			fs.closeSync(fd);
			
			exec("chmod +x " + TARGET);
			logger.info('Wrote', TARGET);
		});
	});
});

// ********
// node-specific walk implementation

function walk(path, callback) {
	var stat = fs.statSync(path);
	
	if (!stat.isDirectory()) { throw new Error('walk: ' + path + ' is not a directory'); }

	var files = fs.readdirSync(path),
		items = {files: [], dirs: []};
	
	files.forEach(function(name) {
		var absPath = util.path.buildPath(path, name);
		if (fs.statSync(absPath).isDirectory()) {
			if (walk(absPath, callback) == true) { return false; }
			items.dirs.push(absPath);
		} else {
			items.files.push(absPath);
		}
	});
	
	return callback(path, items.files, items.dirs);
}
