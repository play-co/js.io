"use import";

import util.optparse;

var closurePath = '';

exports.logger = logger;

exports.init = function(compiler) {
	var stat = util.optparse(process.argv, optDef);
	opts = stat.opts;
	
	if (opts.closurePath) { closurePath = opts.closurePath; }

	var store = jsio('import preprocessors.compiler');
	store.setCompressor(exports.compressor);
	
	compiler.run(stat.args, stat.opts);
};

exports.onError = function(msg) {
	util.optparse.printUsage('<node> compile.js <initial import>\n\t where <initial import> looks like "import .myModule"', optDef);
	jsio.__env.log('');
	logger.error('\n' + msg);
	jsio.__env.log('');
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
	    closure = spawn('java', ['-jar', closurePath || 'closure.jar']),
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
		}
	});
	closure.stdin.write(src);
	closure.stdin.end();
}

var optDef = {
	'-g': {
		also: '--compressJsio',
		name: 'compressJsio',
		type: 'boolean',
		description: "Compress with Google's Closure Compiler"
	},
	'-c': {
		also: '--compress',
		name: 'compressSources',
		type: 'boolean',
		description: "Compress all sources with Google's Closure Compiler"
	},
	'--closure': {
		name: 'closurePath',
		type: 'string',
		description: "Path to closure.jar, if using compression (default: cwd)"
	},
	'-d': {
		also: '--debug',
		name: 'debug',
		type: 'integer',
		minimum: 0,
		maximum: 5,
		constants: {
			'DEBUG': 1,
			'LOG': 2,
			'INFO': 3,
			'WARN': 4,
			'ERROR': 5
		},
		description: "Turn on the compiler logger. A value of i logs all levels i and higher. 1: DEBUG, 2: LOG, 3: INFO, 4: WARN, 5: ERROR"
	},
	'-p': {
		name: 'package',
		also: '--package',
		type: 'object',
		description: "Specifies a package file.  The compiler looks for configuration parameters from the command line as well as the package file.  Command line options have precedence over package settings provided in the package file."
	},
	'-j': {
		name: 'jsioPath',
		type: 'string',
		also: '--jsio',
		description: "Provides an alternative path for jsio.  This path must contain the file 'jsio.js'.  The compiler contains a copy of jsio, so this is optional (can be used to compile against custom versions of jsio)."
	},
	'-o': {
		name: 'outputFile',
		type: 'string',
		also: '--output',
		description: "The filename to write the compiled code to.  Defaults to stdout (prints to the console)."
	},
	'--dontModifyJsio': {
		name: 'dontModifyJsio',
		type: 'boolean',
		description: "(advanced option) Don't modify the core jsio JS.  This option adds source by using jsio's external API (setCachedSrc) rather than the cache table."
	},
	'--dontIncludeJsio': {
		name: 'dontIncludeJsio',
		type: 'boolean',
		description: "(advanced option) Don't include a copy of jsio. This also enables --dontModifyJsio."
	}
}
