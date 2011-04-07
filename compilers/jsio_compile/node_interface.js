"use import";

import util.optparse;
import .optsDef;

var closurePath = '';
(function() {
	var path = require('path');
	var defaultPath = path.join(path.dirname(jsio.__filename), 'jsio_minify.jar');
	if (path.existsSync(defaultPath)) {
		closurePath = defaultPath;
	}
})();

exports.logger = logger;

function findMinifier(jarPath) {
	var path = require('path');
	if (path.existsSync(jarPath)) {
		closurePath = jarPath;
	}
}

function usage() {
	util.optparse.printUsage('<node> compile.js <initial import>\n\t where <initial import> looks like "import .myModule"', optsDef);
}

exports.init = function(compiler, args, opts) {
	if (!args) {
		var result = util.optparse(process.argv, optsDef),
			args = result.args,
			opts = result.opts;
	}
	
	if (opts.help) {
		usage();
		process.exit();
	}
	
	findMinifier(opts.closurePath);
	
	opts.compressor = exports.compressor;
	compiler.run(args, opts);
};

exports.onError = function(msg) {
	usage();
	jsio.__env.log('');
	logger.error('\n' + msg);
	jsio.__env.log('');
	process.exit(1);
}

exports.onFinish = function(opts, src) {
	if (opts.outputFile) {
		logger.info('Writing output to', opts.outputFile);
		var fs = require('fs');
		fs.writeFileSync(opts.outputFile, src);
	} else {
		logger.info('Writing output to stdout');
		require('sys').print(src);
	}
}

exports.compressor = function(src, callback) {
	function fail(err) {
		if (err) {
			var sys = require('sys');
			sys.print(err);
		}
		callback(src);
	}
	
	if (!closurePath) { return fail(); }
	
	var spawn = require('child_process').spawn,
	    closure = spawn('java', ['-jar', closurePath || 'jsio_minify.jar', '--compilation_level', 'SIMPLE_OPTIMIZATIONS']),
		stdout = [],
		stderr = [];
	
	closure.stdout.on('data', function(data) { stdout.push(data); });
	closure.stderr.on('data', function(data) { stderr.push(data); });
	closure.on('exit', function(code) {
		if (code == 0) {
			callback(stdout.join(''));
		} else {
			fail(stderr.join(''));
		}
	});
	
	closure.stdin.write(src);
	closure.stdin.end();
}

