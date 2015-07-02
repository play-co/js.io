import .esprima;

function validate(code, filename) {
  try {
    var syntax = esprima.parse(code, { tolerant: true, loc: true });
    var errors = syntax.errors;
    if (errors.length > 0) {
      logErrors(filename, code, errors);
    }
  } catch (e) {
    logErrors(filename, code, [e]);
  }
}

function padString(str, pad) {
  str = str + '';
  while (str.length < pad) {
    str = ' ' + str;
  }
  return str;
}

function logColor(color, str) {
  if (console.group) {
    str = '%c' + str;
    console.log(str, 'color:' + color);
  } else {
    console.log(str);
  }
}

function logErrors(filename, code, errors) {
  var title = "Syntax Error (" + filename + "):";
  if (console.group) {
    console.group("%c" + title, "color: red; text-decoration: underline");
  } else {
    console.error("Syntax Error:");
  }

  var linesBefore = 3;
  var linesAfter = 3;
  var lines = code.split('\n');
  for (var i = 0; i < errors.length; i += 1) {
    var e = errors[i];
    var pad = ('' + (e.lineNumber + linesAfter)).length;
    printLines(pad, lines, e.lineNumber - linesBefore, e.lineNumber - 1);
    logColor("red", padString(e.lineNumber, pad) + ' ' + lines[e.lineNumber - 1]);

    logColor("blue", new Array(pad + e.column + 1).join('·') + '^');

    printLines(pad, lines, e.lineNumber + 1, e.lineNumber + 1 + linesAfter);

    logColor("red", "Line " + e.lineNumber + ": " + e.description);
  }

  console.groupEnd && console.groupEnd();
}


var printLines = console.group
  ? function (pad, lines, from, to) {
      for (var j = from; j <= to; ++j) {
        console.log('%c' + padString(j, pad) + ' %c' + lines[j - 1], 'color: gray', 'color: auto');
      }
    }
  : function (pad, lines, from, to) {
      for (var j = from; j <= to; ++j) {
        console.log(padString(j, pad), lines[j - 1]);
      }
    };

exports = validate;
