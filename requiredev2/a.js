origRequire = require;
require = function() {
    node.debug('REQUIRE: ' + JSON.stringify(arguments[0]) + "");
}
origRequire('b.js');

