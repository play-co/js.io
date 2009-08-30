jsio.browser = jsio.Singleton(function() {
	this.style = function(el, style) {
		for(prop in style) {
			switch(prop) {
				case 'opacity':
					break;
				default:
					el.style[prop] = style[prop];
					break;
			}
		}
	}
	
	this.connect = function(el, name, f) {
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
});
