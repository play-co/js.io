import lib.Enum;
import math.geom.Point as Point;
import math.geom.Line as Line;

/**
 * Model a rectangle.
 */

var Rect = exports = Class(function() {
	this.init = function(a, b, c, d) {
		switch(arguments.length) {
			case 0: // init
				this.width = this.height = this.x = this.y = 0;
				break;
			case 1: // copy
				this.width = a.width;
				this.height = a.height;
				this.x = a.x;
				this.y = a.y;
				break;
			case 2: // (x, y), (width, height)
				this.x = a.x;
				this.y = a.y;
				this.width = b.x;
				this.height = b.y;
				break;
			case 3: // (x, y), width, height
				this.x = a.x;
				this.y = a.y;
				this.width = b;
				this.height = c;
				break;
			case 4: // x, y, width, height
				this.x = a;
				this.y = b;
				this.width = c;
				this.height = d;
				break;
		}
	}

	/**
	 * Normalize negative height and width dimensions by adjusting the position
	 * of the rect.
	 */
	
	this.normalize = function() {
		if (this.width < 0) {
			this.x -= this.width;
			this.width = -this.width;
		}
		
		if (this.height < 0) {
			this.y -= this.height;
			this.height = -this.height;
		}
		return this;
	}

	/**
	 * Generate the union of a rectange with another rectangle.
	 */
	
	this.unionRect = function(rect) {
		this.normalize();
		if (rect.normalize) { rect.normalize(); }
		
		var x2 = this.x + this.width,
			y2 = this.y + this.height;
		
		var rx2 = rect.x + rect.width,
			ry2 = rect.y + rect.height;
		
		this.x = this.x < rect.x ? this.x : rect.x;
		this.y = this.y < rect.y ? this.y : rect.y;
		
		this.width = (x2 > rx2 ? x2 : rx2) - this.x;
		this.height = (y2 > ry2 ? y2 : ry2) - this.y;
	};

	/**
	 * Get a point for the given corner.
	 */
	
	this.getCorner = function(i) {
		switch(i) {
			case CORNER.TOP_LEFT:
				return new Point(this.x, this.y);
			case CORNER.TOP_RIGHT:
				return new Point(this.x + this.width, this.y);
			case CORNER.BOTTOM_LEFT:
				return new Point(this.x, this.y + this.height);
			case CORNER.BOTTOM_RIGHT:
				return new Point(this.x + this.width, this.y + this.height);
		}
	}

	/**
	 * Return a line corresponding to the given side.
	 */
	
	this.getSide = function(i) {
		switch(i) {
			case SIDE.TOP:
				return new Line(this.getCorner(CORNER.TOP_LEFT), this.getCorner(CORNER.TOP_RIGHT));
			case SIDE.RIGHT:
				return new Line(this.getCorner(CORNER.TOP_RIGHT), this.getCorner(CORNER.BOTTOM_RIGHT));
			case SIDE.BOTTOM:
				return new Line(this.getCorner(CORNER.BOTTOM_RIGHT), this.getCorner(CORNER.BOTTOM_LEFT));
			case SIDE.LEFT:
				return new Line(this.getCorner(CORNER.BOTTOM_LEFT), this.getCorner(CORNER.TOP_LEFT));
		}
	}

	/**
	 * Return the center point of a rectangle.
	 */
	
	this.getCenter = function() {
		return new Point(this.x + this.width / 2, this.y + this.height / 2);
	}
});

var SIDE = Rect.SIDE = lib.Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT'),
	CORNER = Rect.CORNER = lib.Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');
