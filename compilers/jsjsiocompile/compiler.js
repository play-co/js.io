jsio('from base import *');
var logger = logging.get('jsjsiocompiler');

var compiler = exports;

var supportedEnvs = {
	node: true,
	browser: true
};

var interface = null;

exports.start = function() {
	if (!jsio.__env.name in supportedEnvs) {
		logger.error("autostart failed: unknown environment.\n\n\tTry using compiler.run(args, opts) instead.");
		return;
	}
	
	var DYNAMIC_IMPORT_COMPILER = '.' + jsio.__env.name + '_interface';
	
	interface = jsio(DYNAMIC_IMPORT_COMPILER);
	
	// expects the interface to eventually call startWithOpts to do the actual compile
	interface.init(compiler);
}

/**
 * args : array of arguments
 *   - args[0] : string - initial import string (optional if opts.package is provided)
 * opts : object
 *   - package : string - filename of a package definition
 *   - debug : integer - debug level (1 - 4)
 */
exports.run = function(args, opts) {
	
	var debugLevel = 'debug' in opts ? opts.debug : 4;

	logger.setLevel(debugLevel);
	interface.logger.setLevel(debugLevel);
	logging.get('preprocessors.compiler').setLevel(debugLevel);
	
	if (debugLevel < 5) {
		var strOpts = JSON.stringify(opts, null, '\t');
		logger.info('Starting compiler with options:', strOpts.substring(1, strOpts.length - 1));
	}
	
	var initial;
	
	if (opts.package) {
		try {
			var pkgDef = eval(jsio.__env.fetch(opts.package));
		} catch(e) {
			logger.error('Error reading package file:', opts.package, '\n\t', e);
			
		}
		
		initial = pkgDef.root;
	}
	
	if (args.length > 2) { initial = args[2]; }
	
	if (!initial) {
		interface.onError('No initial import specified');
		return;
	}
	
	var store = jsio('import preprocessors.compiler');
	if (args[0]) {
		store.compile('import base');
		logger.info('compiling using: ', initial)
		store.compile(initial, {
			autoDetectPaths: true,
			dynamicImports: {
				ENV: null
			}
		});
	}
	
	store.generateSrc(opts, bind(interface, 'onFinish', opts));
}
