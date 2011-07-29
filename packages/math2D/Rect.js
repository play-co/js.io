"use import";

import lib.Enum;
import .Point;
import .Line;

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
	}
	
	this.getCorner = function(i) {
		switch(i) {
			case CORNERS.TOP_LEFT:
				return new Point(this.x, this.y);
			case CORNERS.TOP_RIGHT:
				return new Point(this.x + this.width, this.y);
			case CORNERS.BOTTOM_LEFT:
				return new Point(this.x, this.y + this.height);
			case CORNERS.BOTTOM_RIGHT:
				return new Point(this.x + this.width, this.y + this.height);
		}
	}
	
	this.getSide = function(i) {
		switch(i) {
			case SIDES.TOP:
				return new Line(this.getCorner(CORNERS.TOP_LEFT), this.getCorner(CORNERS.TOP_RIGHT));
			case SIDES.RIGHT:
				return new Line(this.getCorner(CORNERS.TOP_RIGHT), this.getCorner(CORNERS.BOTTOM_RIGHT));
			case SIDES.BOTTOM:
				return new Line(this.getCorner(CORNERS.BOTTOM_RIGHT), this.getCorner(CORNERS.BOTTOM_LEFT));
			case SIDES.LEFT:
				return new Line(this.getCorner(CORNERS.BOTTOM_LEFT), this.getCorner(CORNERS.TOP_LEFT));
		}
	}
	
	this.getCenter = function() {
		return new Point(this.x + this.width / 2, this.y + this.height / 2);
	}
});

var SIDES = Rect.SIDES = lib.Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT'),
	CORNERS = Rect.CORNERS = lib.Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');
