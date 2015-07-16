var tsc = require('typescript-compiler');

exports = function (path, moduleDef, opts) {
  if (/\.ts$/.test(moduleDef.filename)) {
    //it is a typescript file
    moduleDef.src = tsc.compileString(moduleDef.src);
  }
};
