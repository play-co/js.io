import fs;
import path;
import child_process;

var node = process.argv[0];

var BUILD_DIR = 'build';
var TARGET = path.join(BUILD_DIR, 'jsio_compile');
var CACHE_PATH = path.join(BUILD_DIR, '.cache');

// setup logging
logger = logging.get('compiler');
logging.get('preprocessors.compiler').setLevel(0);

import lib.Callback;
var cb = new lib.Callback();

child_process.exec('mkdir -p ' + BUILD_DIR, null, cb.chain());
child_process.exec('mkdir -p ' + CACHE_PATH, null, cb.chain());


exports.run = function (compress) {
	cb.run(bind(this, run, compress));
}

function run (compress) {
	// get access to jsio path util functions
	import util.path;
	
	logger.log('building jsio_compile...');
	import preprocessors.compiler as compiler;
	import .node_interface as nodeInterface;

	nodeInterface.logger.setLevel(0);

	compiler.setCompilerOpts({
		compressor: bind(nodeInterface, 'compress'),
		environment: jsio.__env.name,
		dynamicImports: {
			COMPILER: 'import .node_interface'
		}
	});

	logger.log('processing compiler preprocessor...');
	compiler.compile('import preprocessors.compiler');

	logger.log('processing compiler...');
	compiler.compile('import .compiler');

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

	compiler.generateSrc({compressorCachePath: CACHE_PATH, compressSources: compress, compressResult: compress}, function(src) {
		var fd = fs.openSync(TARGET, 'w');
		fs.writeSync(fd, '#!/usr/bin/env node\n');
		fs.writeSync(fd, src);
		fs.writeSync(fd, 'jsio("import .compiler").start()');
		fs.closeSync(fd);

		child_process.exec("chmod +x " + TARGET);
		logger.info('Wrote', TARGET);
	});
}

// ********
// node-specific walk implementation

function walk(path, callback) {
	var stat = fs.statSync(path);
	
	if (!stat.isDirectory()) { throw new Error('walk: ' + path + ' is not a directory'); }

	var files = fs.readdirSync(path),
		items = {files: [], dirs: []};
	
	files.forEach(function(name) {
		var absPath = util.path.join(path, name);
		if (fs.statSync(absPath).isDirectory()) {
			if (walk(absPath, callback) == true) { return false; }
			items.dirs.push(absPath);
		} else {
			items.files.push(absPath);
		}
	});
	
	return callback(path, items.files, items.dirs);
}

