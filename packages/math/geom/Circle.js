import .Point;

/**
 * @extends math.geom.Point
 * Models a circle given a radius.
 *   Circle(x, y, radius)
 *   Circle({x: default 0, y: default 0, radius: default 0})
 */
exports = Class(Point, function(supr) {
	this.init = function(a, b, c) {
		switch(arguments.length) {
			case 0:
				this.x = 0;
				this.y = 0;
				this.radius = 0;
				break;
			case 1:
			case 2:
				this.x = a.x || 0;
				this.y = a.y || 0;
				this.radius = a.radius || 0;
				break;
			case 3:
				this.x = a;
				this.y = b;
				this.radius = c;
				break;
		}
	}

	/**
	 * Scale the position and radius of this circle by a percentage.
	 */
	
	this.scale = function(s) {
		supr(this, 'scale', arguments);
		this.radius *= s;
		return this;
	}
});