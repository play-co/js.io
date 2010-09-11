var Point = Class(function() {
	this.init = function(x, y) {
		if (typeof x == 'number') {
			this.x = x;
			this.y = y;
		} else {
			this.x = x.x;
			this.y = x.y;
		}
	}
	
	this.rotate = function(r) {
		var x = this.x,
			y = this.y,
			cosr = Math.cos(r),
			sinr = Math.sin(r);
		
		this.x = x * cosr - y * sinr;
		this.y = x * sinr + y * cosr;
		
		return this;
	}
	
	this.add = function(x, y) {
		if (typeof x == 'number') {
			this.x += x;
			this.y += y;
		} else {
			this.x += x.x;
			this.y += x.y;
		}
		return this;
	}
	
	this.subtract = function(x, y) {
		if (typeof x == 'number') {
			this.x -= x;
			this.y -= y;
		} else {
			this.x -= x.x;
			this.y -= x.y;
		}
		return this;
	}

	this.scale = function(s) {
		this.x *= s;
		this.y *= s;
		return this;
	}
	
	this.setMagnitude = function(m) {
		var theta = Math.atan2(this.y, this.x);
		this.x = m * Math.cos(theta);
		this.y = m * Math.sin(theta);
		return this;
	}
	
	this.addMagnitude = function(m) { return this.setMagnitude(this.getMagnitude() + m); }
	this.getMagnitude = function() { return Math.sqrt(this.x * this.x + this.y * this.y); }
	
	this.inBox = function(x1, y1, x2, y2) {
		var x = this.x,
			y = this.y;
		return x >= x1 && x <= x2 && y >= y1 && y <= y2;
	}
});

exports.Point = Point;

exports.add = exports.translate = function(a, b, c, d) {
	switch(arguments.length) {
		case 2: return new Point(a).add(b);
		case 3: return new Point(a).add(b, c);
		case 4: return new Point(a, b).add(c, d);
	}
}

exports.subtract = function(a, b, c, d) {
	switch(arguments.length) {
		case 2: return new Point(a).subtract(b);
		case 3: return new Point(a).subtract(b, c);
		case 4: return new Point(a, b).subtract(c, d);
	}
}

exports.scale = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).scale(b);
		case 3: return new Point(a, b).scale(c);
	}
}

exports.setMagnitude = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).setMagnitude(c);
		case 3: return new Point(a, b).setMagnitude(c);
	}
}

exports.addMagnitude = function(a, b, c) {
	switch(arguments.length) {
		case 2: pt = new Point(a); break;
		case 3: pt = new Point(a, b); b = c; break;
	}
	
	return pt.addMagnitude(b);
}

exports.getMagnitude = function(a, b) { return new Point(a, b).getMagnitude(); }

exports.rotate = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).rotate(b);
		case 3: return new Point(a, b).rotate(c);
	}
}

exports.inBox = function(a, b, c, d, e, f) {
	switch(arguments.length) {
		case 5: return new Point(a).inBox(b, c, d, e);
		case 6: return new Point(a, b).inBox(c, d, e, f);
	}
}
