// var logger = require('./logger');
// logger.replaceLogger("var foo = logger.log('123');")

var loggerRegex = /logger\.(log|warn|info|error|debug)\(/g;
var delimiterRegex = /^(\\.|[\(\)"'\\])/;

exports = function (path, moduleDef, opts) {
  moduleDef.src = exports.replaceLogger(moduleDef.src, moduleDef.friendlyPath);
}

exports.replaceLogger = function (src, prefix) {

  loggerRegex.lastIndex = 0;

  while (true) {
    var match = loggerRegex.exec(src);
    if (!match) { break; }

    var i = match.index + match[0].length;
    var tokens = [];
    function nextToken() {
      // we have a token in the queue
      if (tokens.length) { return tokens.shift(); }

      // we have a delimiter token next, max length of 2
      var match = (src[i] + src[i + 1]).match(delimiterRegex);
      if (match) {
        i += match[0].length;
        return match[0];
      }

      // advance to next delimiter
      var token = '';
      do {
        token += src[i++];
      } while (src[i] && !delimiterRegex.test(src[i]));
      return token;
    }

    function consumeString(startQuote) {
      var token;
      do {
        token = nextToken();
      } while (token && token != startQuote);
    }

    function consumeParens() {
      var token;
      do {
        token = nextToken();

        // start a quoted string
        if (token == '"' || token == "'") {
          consumeString(token);
        }

        // start a nested parenthesis
        if (token == '(') {
          consumeParens();
        }
      } while (token && token != ')');
    }

    // consume string up until close parenthesis for logger.log(...)
    consumeParens();

    var start = match.index + match[0].length;
    var type = match[1];
    var str = src.substring(start, i - 1);

    // var replacement = 'console.log(' + str + ')';
    var replacement = 'logger.' + type.toUpperCase() + '&&console.' + type + '("' + type.toUpperCase() + '","' + prefix + '",' + str + ')';
    // var replacement = 'logger._' + type + '(' + str + ')(function(){console., console.' + type + ')'
    src = src.substring(0, match.index)
      + replacement
      + src.substring(i);

    loggerRegex.lastIndex = match.index + replacement.length;
  }

  return src;
}
