if (jsio.__env.name == 'browser') {
	jsio('external .sizzle import Sizzle');
	jsio('import math2D.Rect');
	
	function isWindow(el) {
		return el && !$.isElement(el) && $.isElement(el.document);
	}
	
	var singleId = /^#([\w-]+)$/;
	
	var $ = exports.$ = function(selector, win) {
		switch(typeof selector) {
			case 'object':
				if ($.isElement(selector)) {
					return $.remove(selector);
				} else if ($.isElement(selector.document && selector.document.body)) {
					return $.size(selector);
				}
				return $.create(selector);
			case 'string':
				if (singleId.test(selector)) { return $.id(selector.substring(1), win); }
				return Sizzle.apply(GLOBAL, arguments);
		}
	}
	
	var DOM2 = typeof HTMLElement === "object";
	$.isElement = function(el) {
		return el && 
			(DOM2 ? el instanceof HTMLElement
				: typeof el.nodeType == 'number' && typeof el.nodeName == 'string');
	}
	
	$.id = function(id, win) { return typeof id == 'string' ? (win || window).document.getElementById(id) : id; }

	$.apply = function(el, params) {
		if (params.attrs) {
			for(attr in params.attrs) {
				el.setAttribute(attr, params.attrs[attr]);
			}
		}
		
		if (params.id) { el.id = params.id; }
		if (params.style) { $.style(el, params.style); }
		if (params.src) { el.src = params.src; }
		if (params['class'] || params['className']) {
			el.className = params['class'] || params['className'];
		}
		
		var parent = params.parent || params.parentNode;
		if (params.before) {
			$.insertBefore(params.before.parentNode || parent, el, params.before);
		} else if (params.after) {
			$.insertAfter(params.after.parentNode || parent, el, params.after);
		} else if (parent) {
			parent.appendChild(el);
		}
		
		if ('html' in params) { el.innerHTML = params.html; }
		if ('text' in params) { $.setText(el, params.text); }
		return el;
	}
	
	$.insertBefore = function(parentNode, el, beforeNode) {
		if (!parentNode || !el) { return; }
		if (beforeNode && beforeNode.parentNode == parentNode) {
			parentNode.insertBefore(el, beforeNode);
		} else {
			parentNode.appendChild(el);
		}
	}
	
	$.insertAfter = function(parentNode, el, afterNode) {
		if (!parentNode || !el) { return; }
		if (!afterNode || afterNode.parentNode != parentNode) {
			$.insertBefore(parentNode, el, parentNode.firstChild);
		} else if (!afterNode.nextSibling) {
			parentNode.appendChild(el);
		} else {
			parentNode.insertBefore(el, afterNode.nextSibling);
		}
	}

	$.create = function(params) {
		var doc = ((params && params.win) || window).document;
		if (!params || typeof params == 'string') {
			return doc.createElement(params || 'div');
		};

		return $.apply(doc.createElement(params.tag || params.tagName || 'div'), params);
	}

	$.show = function(el, how) { $.id(el).style.display = how || 'block'; }
	$.hide = function(el) { $.id(el).style.display = 'none'; }

	// accepts an array or a space-delimited string of classNames
	$.addClass = function(el, classNames) {
		if (!el) { return; }
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
	
	$.getTag = function(from, tag) { return from.getElementsByTagName(tag); }

	$.removeClass = function(el, classNames) {
		if (!el) { return; }
		var el = $.id(el);
		el.className = (' ' + el.className + ' ')
			.replace(' ', '  ')
			.replace(new RegExp('( ' + classNames.replace('\s+', ' | ').replace('-','\-') + ' )', 'g'), '')
			.replace(/\s+/, ' ')
			.replace(/^\s+|\s+%/, '');
	}

	function ieGetAlpha(el) {
		try {
			return el.filters.item("alpha");
		} catch(e) {}
	
		try {
			return el.filters.item("progid:DXImageTransform.Microsoft.Alpha");
		} catch(e) {}
	
		return null;
	}

	$.style = function(el, style) {
		if(el instanceof Array) {
			for(var i = 0, o; o = el[i]; ++i) { $.style(o, style); }
			return;
		}
	
		el = $.id(el);
		var s = el.style;
		for(prop in style) {
			switch(prop) {
				case 'float':
					s.styleFloat = s.cssFloat = style[prop];
					break;
				case 'opacity':
					s.opacity = style[prop];
					if(el.filters) {
						try {
							var alpha = ieGetAlpha();
							var opacity = style[prop] == 1 ? 99.99 : style[prop] * 100;
							if(!alpha) {
								// TODO: this might destroy any existing filters?
								s.filter = "alpha(opacity=" + opacity + ")";
							} else {
								alpha.Opacity = opacity;
							}
						} catch(e) {}
					}
					break;
				case 'boxSizing':
					s.MsBoxSizing = s.MozBoxSizing = s.WebkitBoxSizing = style[prop];
				default:
					s[prop] = style[prop];
					break;
			}
		}
	};

	$.onEvent = function(el, name, f) {
		if (typeof f != 'function') {
			f = bind.apply(GLOBAL, Array.prototype.slice.call(arguments, 2));
		}
	
		var handler = f;
	
		el = $.id(el);
		if(el.addEventListener) { 
			el.addEventListener(name, handler, false);
		} else {
			handler = function(e) {
				var evt = e || window.event;
				// TODO: normalize the event object
				f(evt);
			};
		
			el.attachEvent('on' + name, handler);
		}
	
		return bind($, 'removeEvent', el, name, handler);
	};

	$.removeEvent = function(el, name, f) {
		el = $.id(el);
		if (el.addEventListener) {
			el.removeEventListener(name, f, false);
		} else {
			el.detachEvent('on' + name, f);
		}
	}

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
		offset.top = ev.clientY - offset.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
		offset.left = ev.clientX - offset.left + (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft);
		return offset;
	}

	$.pos = function(el) {
		var parent = el;
		var offset = {top: 0, left: 0};
		while(parent && parent != document.body) {
			offset.left += parent.offsetLeft;
			offset.top += parent.offsetTop;
			while(parent.offsetParent != parent.parentNode) {
				offset.top -= parent.scrollTop; offset.left -= parent.scrollLeft;
				parent = parent.parentNode;
			}
			parent = parent.offsetParent;
		}
		return offset;
	}
	
	$.size = function(el) {
		if ($.isElement(el)) {
			return {width: el.offsetWidth, height: el.offsetHeight};
		} else if (el.document) {
			var doc = el.document.documentElement || el.document.body;
			return new math2D.Rect(
				doc.offsetTop,
				doc.offsetLeft,
				el.innerWidth || (doc.clientWidth || doc.clientWidth),
				el.innerHeight || (doc.clientHeight || doc.clientHeight)
			);
		}
	}
	
	$.insertCSSFile = function(filename) {
		document.getElementsByTagName('head')[0].appendChild($({
			tag: 'link',
			attrs: {
				rel: 'stylesheet',
				type: 'text/css',
				href: filename
			}
		}));
	}
}
