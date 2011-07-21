var Vec2D = exports = Class(function() {
	this.init = function(opts) {
		if ('angle' in opts) {
			this.x = opts.magnitude * Math.cos(opts.angle);
			this.y = opts.magnitude * Math.sin(opts.angle);
		} else {
			this.x = opts.x;
			this.y = opts.y;
		}
	}
	
	this.addForce = function(f) { this.x += f.x; this.y += f.y; }
	this.getAngle = function() { return Math.atan2(this.y, this.x); }
	this.getMagnitude = function() { return Math.sqrt(this.x * this.x + this.y * this.y); }
	this.getUnitVector = function() {
		var angle = this.getAngle();
		return new Vec2D({
						magnitude:1,
						angle: angle});}
						
	this.dot = function(vec) {
		return (this.x * vec.x) + (this.y * vec.y);
	}

	this.add = function(vec) {
		return new Vec2D({x:this.x + vec.x, y:this.y+vec.y});
	}
	
	this.minus = function(vec) {
		return new Vec2D({x:this.x-vec.x, y:this.y-vec.y});
	}
	
	this.negate = function() {
		return new Vec2D({x:-this.x, y:-this.y});
	}
	
	this.multiply = function(scalar) {
		return new Vec2D({angle:this.getAngle(), magnitude:this.getMagnitude()*scalar});
	}

});

