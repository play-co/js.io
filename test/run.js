var posix = require('posix');
var sys = require('sys');
/*
 * We're depending on env.js to supply us with a fake DOM.
 * We'll get it and then mix it into the global context.
 */
var envjs_path = process.ENV['ENVJS_PATH'];
require.paths.push(envjs_path);
var ENV = require('env');
process.mixin(GLOBAL, ENV);

var TestResult = function () {
    this._tests = [];
    this._errors = [];
    this._failures = [];
    
    this.addTest = function (test) {
		this._tests.push(test);
    };
    
    this.addError = function (test, error) {
		this._errors[test] = error;
    };
    
    this.addFailure = function (test, failure) {
		this._failures[test] = failure;
    };
    
    this.isSuccess = function () {
		return this.events().length == 0;
    };
    
    this.testCount = function () {
		return this._tests.length;
    };
    
    this.errorCount = function () {
		return this._errors.length;
    };
    
    this.failureCount = function () {
		return this._failures.length;
    };
    
    this.events = function () {
		var events = [];
		for (err in this._errors) {
			events[err] = this._errors[err];
		};
		for (fail in this._failures) {
			events[fail] = this._failures[fail];
		};
		return events;
    };
};

var _filenameForModname = function (modname) {
	return modname.replace('.', '/').split('.')[0];
};

var TestCase = function (test, name, module) {
    var self = this;
	
    this.name = name;
    this._test = test;
	if (module) {
		this.name = module.name + "." + name;		
	};
	
    this.run = function (result) {
		try {
			self._test();
		} catch (error) {
			result.addError(self.name, error);
		};
    };
};

var TestModule = function (module) {
    var self = this;

    this.name = module;
    
    var _loadTestsFromModule = function (test_file) {
		if (!test_file.match())
		var test_module = require(test_file);
		var tests = [];
		for (name in test_module) {
			process.stdio.writeError("testing test " + module + "." + name + "\n");
			if (_isTest(name)) {
				sys.debug("queuing " + name);
				tests.push(new TestCase(test_module[name], name,
										_filenameForModname(name)));
			};
		};
		return tests;
    };
    this._tests = _loadTestsFromModule(module);
    
    this.run = function (result) {
		for (testname in self._tests) {
			var test = self._tests[testname];
			result.addTest(self);
			try {
				if (module.setup)
					module.setup();
				test(result);
				if (module.teardown)
					module.teardown();
			} catch (error) {
				result.addError(test, error);
			}
		};
    };
};

var TestSuite = function (dirname) {
    var self = this;
    
    this.name = dirname;
    this._modules = [];
    
    var _loadTestModules = function (dirname) {
		process.stdio.writeError("collecting " + dirname + "\n");
		var gatherer = posix.readdir(dirname);
		gatherer.addCallback(
			function (files) {
				for (i in files) {
					var filename = files[i];
					process.stdio.writeError("testing filename " +
											 filename + "\n");
					var isDir = false;
					var dirCheck = posix.stat(filename);
					dirCheck.
						addCallback(
							function (stats) {
								isDir =
									stats.isFile() && stats.isDirectory();
							}).
						addErrback(
							function (err) {
								isDir = false;
							});
				    var test_filename = [dirname, filename].join("/");
					sys.debug([dirname, filename, isDir]);
					if (isDir) {
						self._modules.push(new TestSuite(test_filename));
					} else if (_isTest(modname)) {
						self._modules.push(
							new TestModule(modname)
						);
					};
				};
			});
		gatherer.wait();
    };
    _loadTestModules(dirname);
    
    this.run = function (result) {
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
for (test in events) {    
    var event = events[test];
    process.stdio.write("===================================\n");
    process.stdio.write("Test: " + test.name + "\n");
    process.stdio.write(event.toString() + "\n");
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
