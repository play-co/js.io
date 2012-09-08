/**
 * Model a vector in two-dimensional space.
 * Pass an "angle" option in radians to this function to initialize an angle.
 */

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

	/**
	 * Add a force vector to this vector.
	 */
	
	this.addForce = function(f) {
		this.x += f.x; this.y += f.y;
	};

	/**
	 * Return the angle of this vector.
	 */

	this.getAngle = function() {
		return Math.atan2(this.y, this.x);
	};

	/**
	 * Return the magnitude of this vector.
	 */

	this.getMagnitude = function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * Get a unit vector corresponding to this vector's angle.
	 */

	this.getUnitVector = function() {
		return new Vec2D({
			magnitude:1,
			angle: this.getAngle()
		});
	};

	/**
	 * Return the dot product of this and another vector.
	 */
						
	this.dot = function(vec) {
		return (this.x * vec.x) + (this.y * vec.y);
	};

	/**
	 * Returns a vector that is the addition of this and another vector.
	 */

	this.add = function(vec) {
		return new Vec2D({x:this.x + vec.x, y:this.y+vec.y});
	};

	/**
	 * Returns a vector that is this vector subtracted by another.
	 */
	
	this.minus = function(vec) {
		return new Vec2D({x: this.x-vec.x, y: this.y-vec.y});
	};

	/**
	 * Returns a vector that would negate this vector when added.
	 */
	
	this.negate = function() {
		return new Vec2D({x: -this.x, y: -this.y});
	};

	/**
	 * Returns a vector that multiplies this vector's magnitude by a scalar.
	 */
	
	this.multiply = function(scalar) {
		return new Vec2D({
			angle: this.getAngle(),
			magnitude: this.getMagnitude()*scalar
		});
	};

});

