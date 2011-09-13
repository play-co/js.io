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
		type: 'boolean',
		'default': false,
		description: 'Disables IE checks like trailing commas'
	},
	'-j': {
		name: 'jsioPath',
		type: 'string',
		also: '--jsio',
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
	'--preserveJsioSource': {
		name: 'preserveJsioSource',
		type: 'boolean',
		'default': false,
		description: "(advanced option) Specify this option if the compiler shouldn't modify the core jsio JavaScript.  This option wraps compiled source in the jsio API call setCachedSrc rather than inserting the source into the jsio cache table."
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
