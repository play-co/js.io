let exports = {};

/**
 * Model a vector in two-dimensional space.
 * Pass an "angle" option in radians to this function to initialize an angle.
 */
exports = class Vec2D {
  constructor (opts) {
    if ('angle' in opts) {
      this.x = opts.magnitude * Math.cos(opts.angle);
      this.y = opts.magnitude * Math.sin(opts.angle);
    } else {
      this.x = opts.x;
      this.y = opts.y;
    }
  }

  addForce (f) {
    this.x += f.x;
    this.y += f.y;
  }
  getAngle () {
    return Math.atan2(this.y, this.x);
  }
  getMagnitude () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  getUnitVector () {
    return new Vec2D({
      magnitude: 1,
      angle: this.getAngle()
    });
  }
  dot (vec) {
    return this.x * vec.x + this.y * vec.y;
  }
  add (vec) {
    return new Vec2D({
      x: this.x + vec.x,
      y: this.y + vec.y
    });
  }
  minus (vec) {
    return new Vec2D({
      x: this.x - vec.x,
      y: this.y - vec.y
    });
  }
  negate () {
    return new Vec2D({
      x: -this.x,
      y: -this.y
    });
  }
  multiply (scalar) {
    return new Vec2D({
      angle: this.getAngle(),
      magnitude: this.getMagnitude() * scalar
    });
  }
};
var Vec2D = exports;

export default exports;
