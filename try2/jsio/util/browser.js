exports = {
	style: function(el, style) {
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
	},

	onEvent: function(el, name, f) {
		if(el.addEventListener) { 
			el.addEventListener(name, f, false);
		} else {
			el.attachEvent('on' + name, function(e) {
				var evt = e || window.event;
				// TODO: normalize the event object
				f(evt);
			});
		}
	}
};
