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

exports = function (path, moduleDef) {
  if (/\.ts$/.test(moduleDef.filename)) {
    //it is a typescript file
    readDefs(moduleDef.directory);
    try {
      moduleDef.src = ts.compile(moduleDef.src, defCache);
    } catch (errors) {
      console.error('Error compiling Typescript module:');
      errors.forEach(function(error) {
        var file = error.file;
        var lineInfo = file.getLineAndCharacterFromPosition(error.start);
        console.error(moduleDef.filename + '('
                      + lineInfo.line + ',' + lineInfo.character  + '): '
                      + 'error TS' + error.code +  ': ' +  error.messageText);
      });
      throw new Error('Typescript compile failed.');
    }
  }
};
