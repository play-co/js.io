require('.sizzle', {Sizzle: '$'});

// Browser is a function, and also adds .find, .filter, .selector
exports.$ = $;

$.create = function(tag, params) {
	params = params || {};
	var doc = (params.win || window).document;
	var el = doc.createElement(tag);
	if(params.style) {
		$.style(el, params.style);
	}
	if(params.attrs) {
		for(attr in params.attrs) {
			el.setAttribute(attr, params.attrs[attr]);
		}
	}
	if(params['class'] || params['className']) {
		el.className = params['class'] || params['className'];
	}
	if(params.parent) {
		params.parent.appendChild(el);
	}
	return el;
}

// accepts an array or a space-delimited string of classNames
$.addClass = function(el, classNames) {
	if(typeof classNames == "string") {
		classNames = classNames.split(' ');
	}
	
	var current = ' ' + el.className + ' ';
	for(var i = 0, len = classNames.length, c; (c = classNames[i]) || i < len; ++i) {
		if(current.indexOf(' '+c+' ') == -1) {
			current += c + ' ';
		}
	}
	
	el.className = current;
	return $;
}

$.style = function(el, style) {
	for(prop in style) {
		switch(prop) {
			case 'float':
				el.style.styleFloat = el.style.float = style[prop];
				break;
			case 'opacity':
				el.style.opacity = style[prop];
				break;
			default:
				el.style[prop] = style[prop];
				break;
		}
	}
};

$.onEvent = function(el, name, f) {
	if(el.addEventListener) { 
		el.addEventListener(name, f, false);
	} else {
		el.attachEvent('on' + name, function(e) {
			var evt = e || window.event;
			// TODO: normalize the event object
			f(evt);
		});
	}
};