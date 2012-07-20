#!/usr/bin/env node
/*
 repl.js

 provides a repl for node that correctly sets up
 js.io in the global scope so that you can run
 jsio('import .foo') from the repl.
*/

var vm = require('vm');

//base jsio stuff
require('./packages/jsio.js');
//this puts various jsio objects in the global namespace
jsio('from base import *');
//add these paths so we can use the built-in functionality
jsio.path.add('.');
jsio.path.add('./packages');
jsio('import preprocessors.cls as cls');
jsio('import preprocessors.import as importc');

/*
 * use a custom eval function to run the class and import preprocessors
 * on code entered to the repl.  This allows for 'import foo.bar' syntax
 * as well as properly named Class intances.
 */
var preprocessEval = function(cmd, context, filename, callback) {
	var def = {
		path: filename,
		src: cmd.slice(1, cmd.length-2)
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

/*
 * By passing global: true we use the existing global namespace.  This means,
 * that our jsio environment that we set up will exist.
 */
console.log('js.io repl starting\n');
require('repl').start({
	global: true,
	eval: preprocessEval
});
