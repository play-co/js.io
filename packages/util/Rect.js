"use import";

import lib.Enum;

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
});

var SIDES = Rect.SIDES = lib.Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT'),
	CORNERS = Rect.CORNERS = lib.Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT', 'BOTTOM_LEFT');
