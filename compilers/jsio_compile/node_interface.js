import jsio.util.optparse as optparse;
import .optsDef;

var fs = require('fs');
var path = require('path');
try {
	var crypto = require('crypto');
} catch(e) {}

var closurePath = '';
(function() {
	var path = require('path');
	var defaultPath = path.join(path.dirname(jsio.__filename), 'compiler', 'compiler.jar');
	if (fs.existsSync(defaultPath)) {
		closurePath = defaultPath;
	}
})();

exports.logger = logger;

function findMinifier(jarPath) {
	var path = require('path');
	if (fs.existsSync(jarPath)) {
		closurePath = jarPath;
	}
}

function usage() {
	optparse.printUsage('jsio_compile <initial import>\n\t where <initial import> looks like "import .myModule"', optsDef);
}

var _compiler;
exports.setCompiler = function (compiler) {
	_compiler = compiler;
}

exports.run = function(args, opts) {
	if (!args) {
		var result = optparse(process.argv, optsDef),
			args = result.args,
			opts = result.opts;
	}

	if (opts.help) {
		usage();
		process.exit();
	}

	findMinifier(opts.closurePath);

	_compiler.run(args, opts);
};

exports.onError = function(e) {
	usage();
	jsio.__env.log('\n' + e.message);
	process.exit(1);
}

exports.onFinish = function(opts, src) {
	if (opts.outputFile) {
		logger.info('Writing output to', opts.outputFile);
		var fs = require('fs');
		fs.writeFileSync(opts.outputFile, src);
	} else {
		logger.info('Writing output to stdout');
		process.stdout.write(src);
	}
}

exports.compress = function(filename, src, opts, callback) {
	var cachePath;

	function fail(err) {
		if (err) {
			logger.error(err);
		}
		callback(src);
	}

	if (!closurePath) { return fail(); }

	if (opts.compressorCachePath && filename) {
		try {
			var cacheFilename = (/^\.\//.test(filename) ? 'R-' + filename.substring(2) : 'A-' + filename)
				.replace(/\.\.\//g, '--U--')
				.replace(/\//g, '---');

			cachePath = path.join(opts.compressorCachePath, cacheFilename);

			if (crypto) {
				var hash = crypto.createHash('md5');
				hash.update(src);
				var checksum = hash.digest('hex');
			} else {
				var stat = fs.statSync(filename);
				var checksum = '' + stat.mtime;
			}

			if (fs.existsSync(cachePath)) {
				var cachedContents = fs.readFileSync(cachePath, 'utf8');
				var i = cachedContents.indexOf('\n');
				var cachedChecksum = cachedContents.substring(0, i);
				logger.debug(cachePath, 'current:', checksum, 'cached:', cachedChecksum);
				if (checksum == cachedChecksum) {
					callback(cachedContents.substring(i + 1));
					return;
				}
			}
		} catch(e) {
			logger.error(e);
		}
	}

	// http://code.google.com/p/closure-compiler/wiki/Warnings

	var spawn = require('child_process').spawn;
	var cmd = ['-jar', closurePath || 'jsio_minify.jar', '--compilation_level', 'SIMPLE_OPTIMIZATIONS'];
	if (opts.noIE) {
		cmd.push('--jscomp_off=internetExplorerChecks')
	}

	var closure = spawn('java', cmd);
	var stdout = [];
	var stderr = [];

	closure.stdout.on('data', function(data) { stdout.push(data); });
	closure.stderr.on('data', function(data) { stderr.push(data); });
	closure.on('exit', function(code) {
		if (code == 0) {
			var compressedSrc = stdout.join('');
			try {
				if (cachePath) {
					logger.debug('updating cache for', cachePath, checksum);
					fs.writeFileSync(cachePath, checksum + '\n' + compressedSrc);
				}
			} catch(e) {
				logger.error(e);
			}

			callback(compressedSrc);
		} else {
			fail(stderr.join(''));
		}
	});

	closure.stdin.write(src);
	closure.stdin.end();
}

