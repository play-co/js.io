"use import";

import util.optparse;
import .optsDef;

var closurePath = '';

exports.logger = logger;

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
	if (opts.closurePath) { closurePath = opts.closurePath; }
	
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
	var spawn = require('child_process').spawn,
	    closure = spawn('java', ['-jar', closurePath || 'jsio_minify.jar']),
		stdout = [],
		stderr = [];
	closure.stdout.on('data', function(data) { stdout.push(data); });
	closure.stderr.on('data', function(data) { stderr.push(data); });
	closure.on('exit', function(code) {
		if (code == 0) {
			callback(stdout.join(''));
		} else {
			var sys = require('sys');
			sys.print(stderr.join(''));
			callback(src);
		}
	});
	closure.stdin.write(src);
	closure.stdin.end();
}

