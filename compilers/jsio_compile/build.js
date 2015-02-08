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

import jsio.lib.Callback;
var cb = new jsio.lib.Callback();

child_process.exec('mkdir -p ' + BUILD_DIR, null, cb.chain());
child_process.exec('mkdir -p ' + CACHE_PATH, null, cb.chain());


exports.run = function (compress) {
	cb.run(bind(this, run, compress));
}

function run (compress) {
	logger.log('building jsio_compile...');

	jsio.path.add('jsio_compile', '.');
	jsio.__env.setCwd('../../packages');

	import jsio.preprocessors.compiler as compiler;
	import jsio_compile.node_interface as nodeInterface;

	nodeInterface.logger.setLevel(0);

	compiler.setCompilerOpts({
		compressor: bind(nodeInterface, 'compress'),
		environment: jsio.__env.name
	});

	compiler.compile('import jsio_compile.node_interface');

	logger.log('processing compiler preprocessor...');
	compiler.compile('import jsio.preprocessors.compiler');

	logger.log('processing compiler...');

	compiler.compile('import jsio_compile.compiler');
	// process.exit();

	// grab a full copy of jsio
	var packagePath = '../../packages';
	walk(packagePath, function(files, dirs) {
		files.forEach(function(file) {
			if (/\.js$/.test(file) && !/\/jsio.js$/.test(file)) {
				var relPath = path.relative(packagePath, file);
				var module = 'jsio.' + relPath.replace(/\.js$/, '').replace(/\//g, '.');
				compiler.compile('import ' + module);
			}
		});
	});


	compiler.generateSrc({compressorCachePath: CACHE_PATH, compressSources: compress, compressResult: compress}, function(src) {
		var fd = fs.openSync(TARGET, 'w');
		fs.writeSync(fd, '#!/usr/bin/env node\n');
		fs.writeSync(fd, src);
		fs.writeSync(fd, 'jsio("import jsio_compile.compiler").start()');
		fs.closeSync(fd);

		child_process.exec("chmod +x " + TARGET);
		logger.info('Wrote', TARGET);
	});
}

// ********
// node-specific walk implementation

function walk(dir, callback) {
	var stat = fs.statSync(dir);

	if (!stat.isDirectory()) { throw new Error('walk: ' + dir + ' is not a directory'); }

	var files = fs.readdirSync(dir),
		items = {files: [], dirs: []};

	files.forEach(function(name) {
		var absPath = path.join(dir, name);
		if (fs.statSync(absPath).isDirectory()) {
			if (walk(absPath, callback) == true) { return false; }
			items.dirs.push(absPath);
		} else {
			items.files.push(absPath);
		}
	});

	return callback(items.files, items.dirs);
}

