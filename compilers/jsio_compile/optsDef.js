exports = {
	'-g': {
		also: '--compressResult',
		name: 'compressResult',
		type: 'boolean',
		description: "Compress final output with Google's Closure Compiler"
	},
	'-c': {
		also: '--compress',
		name: 'compressSources',
		type: 'boolean',
		'default': false,
		description: "Compress individual source files with Google's Closure Compiler"
	},
	'--cwd': {
		name: 'cwd',
		description: "sets the current working directory"
	},
	'--pathCache': {
		name: 'pathCache',
		type: 'object'
	},
	'--closure': {
		name: 'closurePath',
		type: 'string',
		description: "Path to closure.jar, if using compression (default: cwd)"
	},
	'--environment': {
		name: 'environment',
		type: 'string',
		description: 'runtime environment to target'
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
	'--dynamic': {
		name: 'dynamicImports',
		type: 'object',
		description: 'Specify dynamic jsio imports'
	},
	'-p': {
		name: 'package',
		also: '--package',
		type: 'object',
		description: "Specifies a package file.  The compiler looks for configuration parameters from the command line as well as the package file.  Command line options have precedence over package settings provided in the package file."
	},
	'--no-ie': {
		name: 'noIE',
		also: '--noIE',
		type: 'boolean',
		'default': false,
		description: 'Disables IE checks like trailing commas'
	},
	'-j': {
		name: 'jsioPath',
		type: 'string',
		also: ['--jsio', '--jsioPath'],
		description: "Provides an alternative path for jsio.  This path must contain the file 'jsio.js'.  The compiler contains a copy of jsio, so this is optional (can be used to compile against custom versions of jsio)."
	},
	'--path': {
		name: 'path',
		type: 'array',
		description: "Provide extra paths (follow --path with a JSON literal array of strings)"
	},
	'-o': {
		name: 'outputFile',
		type: 'string',
		also: '--output',
		description: "The filename to write the compiled code to.  Defaults to stdout (prints to the console)."
	},
	'--includeJsio': {
		name: 'includeJsio',
		type: 'boolean',
		'default': true,
		description: "(advanced option) Defaults to true.  Set to false to exclude jsio from the resulting source.  Setting to false enables --preserveJsioSource."
	},
	'--appendImport': {
		name: 'appendImport',
		type: 'boolean',
		'default': true,
		description: "Defaults to true.  When true, the import statement passed to the compiler is appended to the end of the file."
	},
	'--compressorCachePath': {
		name: 'compressorCachePath',
		type: 'string',
		description: "Provide a path to cache compressed source."
	},
	'--help': {
		type: 'boolean',
		description: "prints this help message"
	}
}
