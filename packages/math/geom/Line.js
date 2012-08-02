import .Point;

exports = Class(function() {
	this.init = function(a, b, c, d) {
		switch(arguments.length) {
			case 0:
				this.start = new Point();
				this.end = new Point();
				break;
			case 1:
				this.start = new Point(a.start);
				this.end = new Point(a.end);
				break;
			case 2:
				this.start = new Point(a);
				this.end = new Point(b);
				break;
			case 3:
				this.start = new Point(a);
				this.end = new Point(b, c);
				break;
			case 4:
			default:
				this.start = new Point(a, b);
				this.end = new Point(c, d);
				break;
		}
	}
	
	this.getMagnitude = 
	this.getLength = function() {
		var dx = this.end.x - this.start.x,
			dy = this.end.y - this.start.y;
		
		return Math.sqrt(dx * dx + dy * dy);
	}
});
