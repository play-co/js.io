if (jsio.__env.name == 'browser') {
	jsio('external ..util.sizzle import Sizzle');
	jsio('import math.geom.Rect');
	
	function isWindow(el) {
		return el && !DOM.isElement(el) && DOM.isElement(el.document);
	}
	
	var singleId = /^#([\w-]+)$/;
	
	var DOM = exports;

	DOM.findAll = function(selector, win) {
		return Sizzle.apply(GLOBAL, arguments);
	}
	
	var DOM2 = typeof HTMLElement === "object";
	DOM.isElement = DOM2
		? function(el) { return el && el instanceof HTMLElement; }
		: function(el) { return el && typeof el.nodeType == 'number' && typeof el.nodeName == 'string' };
	
	DOM.id = function(id, win) { return typeof id == 'string' ? (win || window).document.getElementById(id) : id; }

	DOM.apply = function(el, params) {
		if (params.attrs) {
			for(attr in params.attrs) {
				el.setAttribute(attr, params.attrs[attr]);
			}
		}
		
		if (params.id) { el.id = params.id; }
		if (params.style) { DOM.style(el, params.style); }
		if (params.src) { el.src = params.src; }
		if (params['class'] || params['className']) {
			el.className = params['class'] || params['className'];
		}
		
		var parent = params.parent || params.parentNode;
		if (parent && params.first) {
			DOM.insertBefore(parent, el, parent.firstChild);
		} else if (params.before) {
			DOM.insertBefore(params.before.parentNode || parent, el, params.before);
		} else if (params.after) {
			DOM.insertAfter(params.after.parentNode || parent, el, params.after);
		} else if (parent) {
			parent.appendChild(el);
		}
		
		if ('html' in params) { el.innerHTML = params.html; }
		if ('text' in params) { DOM.setText(el, params.text); }
		
		if (params.children) {
			var c = params.children;
			for (var i = 0, n = c.length; i < n; ++i) {
				el.appendChild(DOM.isElement(c[i]) ? c[i] : $(c[i]));
			}
		}
		
		return el;
	}
	
	DOM.insertBefore = function(parentNode, el, beforeNode) {
		if (!parentNode || !el) { return; }
		if (beforeNode && beforeNode.parentNode == parentNode) {
			parentNode.insertBefore(el, beforeNode);
		} else {
			parentNode.appendChild(el);
		}
	}
	
	DOM.insertAfter = function(parentNode, el, afterNode) {
		if (!parentNode || !el) { return; }
		if (!afterNode || afterNode.parentNode != parentNode) {
			DOM.insertBefore(parentNode, el, parentNode.firstChild);
		} else if (!afterNode.nextSibling) {
			parentNode.appendChild(el);
		} else {
			parentNode.insertBefore(el, afterNode.nextSibling);
		}
	}

	DOM.create = function(params) {
		var doc = ((params && params.win) || window).document;
		if (!params || typeof params == 'string') {
			return doc.createElement(params || 'div');
		};

		return DOM.apply(params.el || doc.createElement(params.tag || params.tagName || 'div'), params);
	}

	DOM.show = function(el, how) { DOM.id(el).style.display = how || 'block'; }
	DOM.hide = function(el) { DOM.id(el).style.display = 'none'; }

	// accepts an array or a space-delimited string of classNames
	DOM.addClass = function(el, classNames) {
		if (!el) { return; }
		var el = DOM.id(el);
		if (typeof classNames == "string") {
			classNames = classNames.split(' ');
		}
	
		var current = ' ' + el.className + ' ';
		for (var i = 0, len = classNames.length; i < len; ++i) {
			var c = classNames[i];
			if (current.indexOf(' ' + c + ' ') == -1) {
				current += c + ' ';
			}
		}
		
		el.className = current.replace(/^\s+|\s+$/g, '');
		return $;
	}
	
	DOM.getTag = function(from, tag) { return from.getElementsByTagName(tag); }

	DOM.removeClass = function(el, classNames) {
		if (!el) { return; }
		var el = DOM.id(el);
		el.className = (' ' + el.className + ' ')
			.replace(' ', '  ')
			.replace(new RegExp('( ' + classNames.replace('\s+', ' | ').replace('-','\-') + ' )', 'g'), ' ')
			.replace(/\s+/, ' ')
			.replace(/^\s+|\s+$/g, '');
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

	DOM.style = function(el, style) {
		if(el instanceof Array) {
			for(var i = 0, o; o = el[i]; ++i) { DOM.style(o, style); }
			return;
		}
	
		el = DOM.id(el);
		var s = el.style;
		for(prop in style) {
			switch(prop) {
				case 'styleFloat':
				case 'cssFloat':
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
				case 'borderRadius':
					s.borderRadius = s.MozBorderRadius = style[prop];
					break;
				case 'boxSizing':
					s.MsBoxSizing = s.MozBoxSizing = s.WebkitBoxSizing = style[prop];
				default:
					s[prop] = style[prop];
					break;
			}
		}
	};

	DOM.onEvent = function(el, name, f) {
		if (typeof f != 'function') {
			f = bind.apply(GLOBAL, Array.prototype.slice.call(arguments, 2));
		}
	
		var handler = f;
	
		el = DOM.id(el);
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

	DOM.removeEvent = function(el, name, f) {
		el = DOM.id(el);
		if (el.addEventListener) {
			el.removeEventListener(name, f, false);
		} else {
			el.detachEvent('on' + name, f);
		}
	}

	DOM.stopEvent = function(e) {
		if (e) {
			e.cancelBubble = true;
			if(e.stopPropagation) e.stopPropagation();
			if(e.preventDefault) e.preventDefault();
		}
	}

	DOM.setText = function(el, text) {
		el = DOM.id(el);
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

	DOM.setValue = function(el, value) {
		el = DOM.id(el);
		if ('value' in el) {
			el.value = value;
		} else if ('value' in el.firstChild) {
			el.firstChild.value = value;
		}
	};

	DOM.remove = function(el) {
		el = DOM.id(el);
		if(el && el.parentNode) {
			el.parentNode.removeChild(el);
		}
	}

	DOM.cursorPos = function(ev, el) {
		var offset = DOM.pos(el);
		offset.top = ev.clientY - offset.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
		offset.left = ev.clientX - offset.left + (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft);
		return offset;
	}

	DOM.pos = function(el) {
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
	
	DOM.size = function(el) {
		if (DOM.isElement(el)) {
			return {width: el.offsetWidth, height: el.offsetHeight};
		} else if (el.document) {
			var doc = el.document.documentElement || el.document.body;
			return new math.geom.Rect(
				doc.offsetTop,
				doc.offsetLeft,
				el.innerWidth || (doc.clientWidth || doc.clientWidth),
				el.innerHeight || (doc.clientHeight || doc.clientHeight)
			);
		}
	}
	
	DOM.insertCSSFile = function(filename) {
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
