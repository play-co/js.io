jsio('external .sizzle import Sizzle');

var $ = exports.$ = Sizzle;

$.id = function(id, win) { return typeof id == 'string' ? (win || window).document.getElementById(id) : id; }

$.create = function(params) {
	var doc = (params.win || window).document;
	if(!params) { params = 'div'; }
	if(typeof params == 'string') { return doc.createElement(params); }
	
	var el = doc.createElement(params.tag || 'div');
	if(params.style) { $.style(el, params.style); }
	if(params.attrs) {
		for(attr in params.attrs) {
			el.setAttribute(attr, params.attrs[attr]);
		}
	}
	if(params['class'] || params['className']) {
		el.className = params['class'] || params['className'];
	}
	if(params.parent) { params.parent.appendChild(el); }
	if(params.html) { el.innerHTML = params.html; }
	if(params.text) { $.setText(el, params.text); }
	return el;
}

$.show = function(el, how) { $.id(el).style.display = how || 'block'; }
$.hide = function(el) { $.id(el).style.display = 'none'; }

// accepts an array or a space-delimited string of classNames
$.addClass = function(el, classNames) {
	var el = $.id(el);
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

$.removeClass = function(el, classNames) {
	var el = $.id(el);
	el.className = (' ' + el.className + ' ')
		.replace(' ', '  ')
		.replace(new RegExp('( ' + classNames.replace(' ', ' | ') + ' )', 'g'), '')
		.replace('\s', ' ')
		.replace(/^\s+|\s+%/, '');
}

$.style = function(el, style) {
	if(el instanceof Array) {
		for(var i = 0, o; o = el[i]; ++i) { $.style(o, style); }
		return;
	}
	
	el = $.id(el);
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
	el = $.id(el);
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

$.stopEvent = function(e) {
	e.cancelBubble = true;
	if(e.stopPropagation) e.stopPropagation();
	if(e.preventDefault) e.preventDefault();
}

$.setText = function(el, text) {
	el = $.id(el);
	text = String(text);
    if ('textContent' in el) {
		el.textContent = text;
    } else if ('innerText' in el) {
		el.innerText = text.replace(/\n/g, ' ');
    } else {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(text));
    }
}

$.remove = function(el) {
	el = $.id(el);
	if(el && el.parentNode) {
		el.parentNode.removeChild(el);
	}
}

$.cursorPos = function(ev, el) {
	var offset = $.pos(el);
	offset.top = ev.clientY - offset.top + document.body.scrollTop;
	offset.left = ev.clientX - offset.left + document.body.scrollLeft;
	return offset;
}

$.pos = function(el) {
	var parent = el;
	var offset = {top: 0, left: 0};
	do {
		offset.left += parent.offsetLeft;
		offset.top += parent.offsetTop;
		while(parent.offsetParent != parent.parentNode) {
			offset.top -= parent.scrollTop; offset.left -= parent.scrollLeft;
			parent = parent.parentNode;
		}
	} while((parent = parent.offsetParent) && parent != document);
	return offset;
}