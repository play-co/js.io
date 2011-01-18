jsio('import .jslint');

var isBrowser = jsio.__env.name == 'browser',
	isRhino = jsio.__env.name == 'rhino',
	base = jsio('base'),
	globals = ['exports', 'jsio', 'logger'];

for (var i in base) {
	globals.push(i);
}

exports = function(code, opts) {
	opts = opts || exports.defaultOpts;
	if (!jslint(code, opts) && opts.display) {
		exports.display(jslint.errors);
	}
	return jslint.errors;
}

exports.display = function(result, title) {
	var log = [title || ''],
		html = ['<div class="_jsioLint_title">' + (title || '') + '</div>'],
		css = [
			 "._jsioLint_title { color: #FFF; padding-bottom: 6px; border-bottom: 3px dashed #888; margin-bottom: 30px }"
			,"._jsioLint_whitespace {color: #444}"
			,"._jsioLint_lineNum { color: rgb(153,207,80)}"
			,"._jsioLint_charNum { color: rgb(51,135,204)}"
			,"._jsioLint_reason { color: rgb(137,189,255)}"
			,"._jsioLint_evidence { color:rgb(226,137,100)}"
		];
	
	function pointTo(line, i) {
		return new Array(i).join(' ') + '\u21D1<span class="_jsioLint_charNum">@' + e.character + '</span>\n';
	}
	
	function whitespace(line) {
		return line.replace(/ /g, '<span class="_jsioLint_whitespace">\u00B7</span>').replace(/\t/g, '<span class="_jsioLint_whitespace">\u21FE   </span>');
	}
	
	for (var i = 0, e; e = result[i]; ++i) {
		log.push(e.line + '-' + e.character + ': ' + e.reason + '\n> ' + e.evidence)
		html.push('<span class="_jsioLint_lineNum">line ' + e.line + '</span>');
		html.push(': ');
		html.push('<span class="_jsioLint_reason">' + e.reason + '</span>');
		if ('evidence' in e) {
			html.push('<div class="_jsioLint_evidence">' + whitespace(e.evidence) + '</div>');
			html.push(pointTo(e.evidence, e.character));
		}
		html.push('\n');
	}
	
	logger.log(log.join('\n'));
	
	jsio('util/browser').$({
		tag: 'pre',
		id: 'syntaxCheck',
		style: {
			padding: '50px',
			fontSize: '16px'
		},
		html: '<style>' + css.join('') + '</style>' + html.join(''),
		parent: $({
			tag: 'div',
			style: {
				background: '#000',
				position: 'absolute',
				top: '0px',
				left: '0px',
				margin: '0px',
				padding: '0px',
				color: '#AAA',
				width: '100%',
				height: '100%',
				overflow: 'auto',
				fontWeight: 'bold',
				fontFamily: 'consolas, "courier new"',
				zIndex: 2000000
			},
			parent: document.body
		})
	});
}

exports.defaultOpts = {
    adsafe     : false, // if ADsafe should be enforced
    bitwise    : false, // if bitwise operators should not be allowed
    browser    : isBrowser, // if the standard browser globals should be predefined
    cap        : true, // if upper case HTML should be allowed
    css        : true, // if CSS workarounds should be tolerated
    debug      : true, // if debugger statements should be allowed
    devel      : true, // if logging should be allowed (console, alert, etc.)
    eqeqeq     : false, // if === should be required
    es5        : false, // if ES5 syntax should be allowed
    evil       : false, // if eval should be allowed
    forin      : false, // if for in statements must filter
    fragment   : true, // if HTML fragments should be allowed
    immed      : true, // if immediate invocations must be wrapped in parens
    laxbreak   : true, // if line breaks should not be checked
    newcap     : true, // if constructor names must be capitalized
    nomen      : false, // if names should be checked
    on         : true, // if HTML event handlers should be allowed
    onevar     : false, // if only one var statement per function should be allowed
    passfail   : false, // if the scan should stop on first error
    plusplus   : false, // if increment/decrement should not be allowed
    regexp     : false, // if the . should not be allowed in regexp literals
    rhino      : isRhino, // if the Rhino environment globals should be predefined
    undef      : false, // if variables should be declared before used
    safe       : false, // if use of some browser features should be restricted
    windows    : false, // if MS Windows-specific globals should be predefined
    strict     : false, // require the "use strict"; pragma
    sub        : true, // if all forms of subscript notation are tolerated
    white      : false, // if strict whitespace rules apply
    widget     : false,  // if the Yahoo Widgets globals should be predefined
    predef     : globals // list of globals
};

exports.warnOpts = {
    adsafe     : false, // if ADsafe should be enforced
    bitwise    : false, // if bitwise operators should not be allowed
    browser    : true, // if the standard browser globals should be predefined
    cap        : true, // if upper case HTML should be allowed
    css        : true, // if CSS workarounds should be tolerated
    debug      : false, // if debugger statements should be allowed
    devel      : false, // if logging should be allowed (console, alert, etc.)
    eqeqeq     : false, // if === should be required
    es5        : false, // if ES5 syntax should be allowed
    evil       : false, // if eval should be allowed
    forin      : false, // if for in statements must filter
    fragment   : true, // if HTML fragments should be allowed
    immed      : true, // if immediate invocations must be wrapped in parens
    laxbreak   : true, // if line breaks should not be checked
    newcap     : true, // if constructor names must be capitalized
    nomen      : false, // if names should be checked
    on         : true, // if HTML event handlers should be allowed
    onevar     : false, // if only one var statement per function should be allowed
    passfail   : false, // if the scan should stop on first error
    plusplus   : false, // if increment/decrement should not be allowed
    regexp     : false, // if the . should not be allowed in regexp literals
    rhino      : true, // if the Rhino environment globals should be predefined
    undef      : false, // if variables should be declared before used
    safe       : false, // if use of some browser features should be restricted
    windows    : true, // if MS Windows-specific globals should be predefined
    strict     : false, // require the "use strict"; pragma
    sub        : true, // if all forms of subscript notation are tolerated
    white      : true, // if strict whitespace rules apply
    widget     : false  // if the Yahoo Widgets globals should be predefined
};
