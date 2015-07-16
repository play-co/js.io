var ts = require('typestring');
var fs = require('fs');

var defCache = {};

var readDefs = function(path) {
  var results = fs.readdirSync(path);
  results.filter(function(result) {
    return !(result in defCache) && /\.d\.ts$/.test(result);
  }).forEach(function(result) {
    defCache[result] = fs.readFileSync(path + result, 'utf-8');  
  });
};

exports = function (path, moduleDef, opts) {
  if (/\.ts$/.test(moduleDef.filename)) {
    //it is a typescript file
    readDefs(moduleDef.directory);
    moduleDef.src = ts.compile(moduleDef.src, defCache);
  }
};
