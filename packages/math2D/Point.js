var Point = exports = Class(function() {
	this.init = function(a, b) {
		switch(arguments.length) {
			case 0:
				this.x = 0;
				this.y = 0;
				break;
			case 1:
				this.x = a.x || 0;
				this.y = a.y || 0;
				break;
			case 2:
				this.x = a;
				this.y = b;
				break;
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
	
	this.translate = 
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
	this.getDirection =
	this.getAngle = function() { return Math.atan2(this.y, this.x); }
	
});

Point.add = Point.translate = function(a, b, c, d) {
	switch(arguments.length) {
		case 2: return new Point(a).add(b);
		case 3: return new Point(a).add(b, c);
		case 4: return new Point(a, b).add(c, d);
	}
}

Point.subtract = function(a, b, c, d) {
	switch(arguments.length) {
		case 2: return new Point(a).subtract(b);
		case 3: return new Point(a).subtract(b, c);
		case 4: return new Point(a, b).subtract(c, d);
	}
}

Point.scale = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).scale(b);
		case 3: return new Point(a, b).scale(c);
	}
}

Point.setMagnitude = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).setMagnitude(c);
		case 3: return new Point(a, b).setMagnitude(c);
	}
}

Point.addMagnitude = function(a, b, c) {
	switch(arguments.length) {
		case 2: pt = new Point(a); break;
		case 3: pt = new Point(a, b); b = c; break;
	}
	
	return pt.addMagnitude(b);
}

Point.getMagnitude = function(a, b) { return new Point(a, b).getMagnitude(); }

Point.rotate = function(a, b, c) {
	switch(arguments.length) {
		case 2: return new Point(a).rotate(b);
		case 3: return new Point(a, b).rotate(c);
	}
}
