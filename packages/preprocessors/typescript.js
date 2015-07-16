var tsc = require('typescript-compiler');

exports = function (path, moduleDef, opts) {
  if (/\.ts$/.test(moduleDef.filename)) {
    //it is a typescript file
    console.error(moduleDef.src);
    moduleDef.src = tsc.compileString(moduleDef.src);
    console.error(moduleDef.src);
  }
};
