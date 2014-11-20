var sliceExpr = /INLINE_SLICE\s*\((.+),\s*(.+)\s*\);/g;

function replace (raw, p1, p2) {
  return '' +
    'var ' + p1 + ' = new Array(' + p2 + '.length); ' +
    'var $_len = ' + p2 + '.length; ' +
    'for (var $_i = 0; $_i !== ' + p2 + '.length; $_i++) { ' +
    p1 + '[$_i] = ' + p2 + '[$_i]; }';
}

exports = function (path, moduleDef, opts) {
  moduleDef.src = moduleDef.src.replace(sliceExpr, replace);
};
