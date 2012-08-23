#!/usr/bin/env node
/*
 repl.js

 provides a repl for node that correctly sets up
 js.io in the global scope so that you can run
 jsio('import .foo') from the repl.
*/

var vm = require('vm');

//base jsio stuff
var jsio = require('./packages/jsio.js');
//this puts various jsio objects in the global namespace
jsio('from base import *');
//add these paths so we can use the built-in functionality
jsio.path.add('.');
jsio.path.add('./packages');
jsio('import preprocessors.cls as cls');
jsio('import preprocessors.import as importc');


//in the repl, or when running `jsio`, we want jsio to be global
global.jsio = jsio;

/*
 * use a custom eval function to run the class and import preprocessors
 * on code entered to the repl.  This allows for 'import foo.bar' syntax
 * as well as properly named Class intances.
 */
var preprocessEval = function(cmd, context, filename, callback) {
	var src = cmd.toString();
	if (src.match(/^\(.*\)/)) {
		src = src.slice(1, cmd.length-2);
	}
	var def = {
		path: filename,
		src: src
	};
	cls(filename, def);
	importc(filename, def);
	var err, result;
	try {
		result = vm.runInThisContext(def.src, def.path);
	} catch (e) {
		err = e;
	}

    callback(err, result);
};

var startRepl = function() {
	console.log('js.io repl starting\n');
	//By passing global: true we use the existing global namespace.  This means
	//that our jsio environment that we set up will exist.

	require('repl').start({
		useGlobal: true,
		eval: preprocessEval
	});
};


if (process.argv.length > 2) {
	var fs = require('fs');
	var src = fs.readFileSync(process.argv[2]);
	preprocessEval(src, null, process.argv[2], function(error, result) {
		if (error) {
			console.log(error.stack);
		}
		process.exit(error ? 1 : 0);
	});
} else {
	startRepl();
}
