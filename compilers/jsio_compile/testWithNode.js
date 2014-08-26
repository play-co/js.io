var jsio = require('../../packages/jsio');
jsio.path.add('jsio_compile', __dirname);
var compiler = jsio('import jsio_compile.compiler');
compiler.start();
