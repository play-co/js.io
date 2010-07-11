var envjs_path = process.ENV['ENVJS_PATH'];
var mjsunit_path = process.ENV['MJSUNIT_PATH'];

var posix = require('posix');
var sys = require('sys');
/*
 * We're depending on env.js to supply us with a fake DOM.
 * We'll get it and then mix it into the global context.
 */
require.paths.unshift(envjs_path);
var ENV = require('env');
process.mixin(GLOBAL, ENV);
process.compile(posix.cat(mjsunit_path).wait(), 'mjsunit');

require.paths.unshift(process.cwd());
require('jsio/jsio');

var Event = function (test, error, logs) {
    var self = this;
    
    self.test = test;
    self.error = error;
    self.logs = logs;
};
var TestResult = function () {
    var self = this;

    self._tests = [];
    self._errors = [];
    self._failures = [];
    
    self.addTest = function (test) {
	self._tests.push(test);
    };
    
    self.addError = function (test, error, logs) {
	var event = new Event(test, error, logs);
	self._errors.push(event);
    };
    
    self.addFailure = function (test, failure, logs) {
	var event = new Event(test, failure, logs);
	self._failures.push(event);
    };
    
    self.isSuccess = function () {
	return self.events().length == 0;
    };
    
    self.testCount = function () {
	return self._tests.length;
    };
    
    self.errorCount = function () {
	return self._errors.length;
    };
    
    self.failureCount = function () {
	return self._failures.length;
    };
    
    self.events = function () {
	var events = self._errors.concat(self._failures);
	return events;
    };
};

/*
 * A TestCase is a function with a name like test_*.
 */
var TestCase = function (name, module) {
    var self = this;
    
    self.name = name;
    self._test = module._code[name];
    if (module) {
	self.name = module.name + "." + name;
    };
    
    self.run = function () {
	self._test();
    };
};

/* 
 * A TestModule is a module that has tests.
 */
var TestModule = function (modulepath) {
    var self = this;

    self.name = modulepath.replace('/', '.');
    self._code = require(modulepath.split('.')[0]);
    
    self._isTest = function (name, func) {
	return ((typeof(func) == 'function') &&
		(name.match('test_.+')));
    };
    var _loadTestsFromModule = function (test_filename) {
	var tests = [];
	for (name in self._code) {
	    if (self._isTest(name, self._code[name])) {
		var test_case = new TestCase(name, self);
		tests.push(test_case);
	    };
	};
	return tests;
    };
    self._tests = _loadTestsFromModule(modulepath);
    
    self.run = function (result) {
	for (testname in self._tests) {
	    var test = self._tests[testname];
	    result.addTest(test);
	    var module = self._code;
	    try {
		if (module && (module.setup)) {
		    module.setup();
		};
		test.run();
		if (module && (module.teardown)) {
		    module.teardown();
		};
	    } catch (error) {
		result.addError(test, error, []);
	    }
	};
    };
};

/*
 * A TestSuite holds TestModules.
 */
var TestSuite = function (dirname) {
    var self = this;
    
    self.name = dirname;
    self._modules = [];
    
    self._isTest = function (filename) {
	var segments = filename.split('/');
	var basename = segments[segments.length-1];
	return basename.match('^test_.+\.js$');
    };
    
    var _loadTestModules = function (dirname) {
	require.paths.push(dirname);
	var gatherer = posix.readdir(dirname);
	gatherer.addCallback(
	    function (files) {
		for (i in files) {
		    var filename = files[i];
		    var full_filename = [dirname, filename].join("/");
		    var isDir = false;
		    isFile = false;
		    var statCheck = posix.stat(full_filename);
		    statCheck.
			addCallback(
			    function (stats) {
				isFile = stats.isFile();
				isDir = (isFile && stats.isDirectory());
			    });
		    statCheck.
			addErrback(
			    function (err) {
				isFile = false;
				isDir = false;
			    });
		    try {
			statCheck.wait();
		    } catch (x) {};
		    if (isDir) {
			self._modules.push(new TestSuite(full_filename));
		    } else if (isFile && (self._isTest(filename))) {
			self._modules.push(
			    new TestModule(full_filename)
			);
		    } else {
		    };
		};
	    });
	gatherer.wait();
	require.paths.pop();
    };
    _loadTestModules(dirname);
    
    self.run = function (result) {
	for (i in self._modules) {
	    var module = self._modules[i];
	    module.run(result);
	};
    };
};

var target = process.cwd();
if (process.ARGV.length > 2) {
    target = process.ARGV[2];
};
var result = new TestResult();
require.paths.push(process.cwd());
var suite = new TestSuite(target);
suite.run(result);

var events = result.events();
for (i in events) {    
    var event = events[i];
    process.stdio.write("===================================\n");
    process.stdio.write("Test: " + event.test.name + "\n");
    if (event.error.stack)
	process.stdio.write(event.error.stack + "\n");
    else
	process.stdio.write(event.error + "\n");
    if (event.logs.length > 0) {
	process.stdio.write("*** captured logs ***\n");
	for (i in event.logs) {
	    process.stdio.write(event.logs[i]);
	};
    };
};
process.stdio.write("===================================\n");
process.stdio.write("Ran " + result.testCount() + " tests\n");
process.stdio.write("\n");
if (result.isSuccess()) {
    process.stdio.write("OK\n");
} else {
    process.stdio.write(result.errorCount() + " errors\n");
    process.stdio.write(result.failureCount() + " failures\n");
};
