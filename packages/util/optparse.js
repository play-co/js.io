"use import";

import util.jsonSchema
import lib.Enum;

/* optparser */

/*

optsDef = {
	'-v': {
		name: 'version',
		description: 'prints the version information',
		args: {
			0: '
		}
	}
}

*/

function ERROR(msg) {
	logger.error(msg);
	process.exit(1);
}

function addAlso(optsDef, also, value) {
	if (typeof also == 'string') {
		optsDef[also] = value;
	} else if (isArray(also)) {
		also.forEach(function (key) {
			optsDef[key] = value;
		});
	} else {
		logger.warn('Key specified in option', optsDef.name, 'is invalid.  Ignoring:', also);
	}
}

var truthyValues = lib.Enum('true', '1', 'yes'),
	falsyValues = lib.Enum('false', '0', 'no');

function addArg(result, optsDef, argv, i) {
	var val,
		srcName = argv[i],
		itemSchema = optsDef[argv[i]],
		len = argv.length,
		itemType = itemSchema && itemSchema.type && itemSchema.type.toLowerCase();
	
	++i;
	switch(itemType) {
		case 'boolean':
			if (typeof argv[i] == 'undefined') {
				val = true;
				--i;
			} else if (argv[i].toLowerCase() in truthyValues) {
				val = true;
			} else if (argv[i].toLowerCase() in falsyValues) {
				val = false;
			} else {
				val = true;
				--i;
			}
			break;
		case 'int':
		case 'integer':
			val = parseInt(argv[i]);
			break;
		case 'float':
		case 'double':
		case 'number':
			val = parseFloat(argv[i]);
			break;
		case 'array':
		case 'object':
			var buf = argv[i];
			while(true) {
				try {
					var val = eval('(' + buf + ')');
					break;
				} catch(e) {}
				++i;
				if (i >= len) { ERROR('Could not parse "' + srcName + '": ' + itemSchema.type + '\n' + buf + '\n' + JSON.stringify(argv)); }
				buf += argv[i];
			}
			break;
		case 'any':
		case 'string':
		default:
			val = argv[i];
			break;
	}
	
	var status = util.jsonSchema.validate(val, itemSchema);
	if (status.valid) {
		result[itemSchema.name] = val;
		return i + 1;
	} else {
		var log = [];
		for(var k = 0, e; e = status.errors[k]; ++k) {
			log.push('\n\t\t' + (e.property ? e.property + ': ' : '') + e.message)
		}
		
		ERROR('\n' + srcName + ': provided value ' + argv[i] + '\n\t' + itemSchema.name + ' option:' + log.join(''));
	}
}

exports = function(argv, origDef) {
	var optsDef = merge({}, origDef),
		result = {};
	for (var i in optsDef) {
		var opt = optsDef[i];
		if ('default' in opt) { result[opt.name] = opt['default']; }
		
		var also = opt.also;
		if (also) {
			if (isArray(also)) {
				for (var j = 0, len = also.length; j < len; ++j) {
					addAlso(optsDef, also[j], opt);
				}
			} else {
				addAlso(optsDef, also, opt);
			}
		}
	}
	
	var unprocessed = [],
		i = 0,
		len = argv.length;
	
	while (i < len) {
		if (argv[i] in optsDef) {
			i = addArg(result, optsDef, argv, i);
		} else {
			unprocessed.push(argv[i]);
			i++;
		}
	}
	
	return {
		args: unprocessed,
		opts: result
	};
}

exports.printUsage = function(usage, optsDef) {
	import util.wordWrap;
	
	var print = jsio.__env.log;
	print('Usage:');
	print('\t' + usage);
	print('Options:');
	for (var i in optsDef) {
		var opt = [i];
		if (optsDef[i].also) {
			if (isArray(optsDef[i].also)) {
				opt = opt.concat(optsDef[i].also);
			} else {
				opt.push(optsDef[i].also);
			}
		}
		print('\t'+opt.join(', '));
		if (optsDef[i].description) {
			print(util.wordWrap(optsDef[i].description, 80, '\t\t'));
		}
	}
}
