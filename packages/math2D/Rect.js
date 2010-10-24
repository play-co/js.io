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
});

var SIDES = Rect.SIDES = lib.Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT'),
	CORNERS = Rect.CORNERS = lib.Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');
