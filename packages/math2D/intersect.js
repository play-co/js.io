"use import";

import .Point;
import .Line;
import .Rect;

var intersect = exports;

intersect.rectAndPt = function(rect, pt) { return intersect.ptAndRect(pt, rect); }
intersect.ptAndRect = function(pt, rect) {
	var x = pt.x,
		y = pt.y;
	
	return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

intersect.circAndPt = function(circ, pt) { return intersect.ptAndCirc(pt, circ); }
intersect.ptAndCirc = function(pt, circ) {
	var dx = pt.x - circ.x,
		dy = pt.y - circ.y;
	return dx * dx + dy * dy < circ.radius * circ.radius;
}

intersect.rectAndRect = function(rect1, rect2) {
	return !(
		   (rect1.y + rect1.height < rect2.y)
		|| (rect2.y + rect2.height < rect1.y)
		|| (rect1.x + rect1.width < rect2.x)
		|| (rect2.x + rect2.width < rect1.x)
	);
}

var SIDES = Rect.SIDES;

intersect.rectAndCircle = function(rect, circle) { return intersect.rectAndCircle(circle, circ); }
intersect.circleAndRect = function(circle, rect) {
	if (intersect.ptAndRect(circle, rect)) {
		return true;
	}
	
	return intersect.lineAndCircle(rect.getSide(1), circle)
		|| intersect.lineAndCircle(rect.getSide(2), circle)
		|| intersect.lineAndCircle(rect.getSide(3), circle)
		|| intersect.lineAndCircle(rect.getSide(4), circle);
}

intersect.circleAndLine = function(circle, line) { return intersect.lineAndCircle(line, circle); }
intersect.lineAndCircle = function(line, circle) {
	var vec = intersect.util.ptToLine(circle, line);
	return vec.getMagnitude() < circle.radius;
}

// util -- does not return a true/false intersection

intersect.util = {};

// returns line from pt to nearest pt on line
intersect.util.ptToLine = function(pt, line) {
	var m = line.getMagnitude(),
		dx = (line.end.x - line.start.x),
		dy = (line.end.y - line.start.y),
		u = ((pt.x - line.start.x) * dx	// TODO can we abstract this from 2D to 2D/3D?
			+ (pt.y - line.start.y) * dy) / 
			  (m * m);

	var i;
	if (u < 0) {
		i = new Point(line.start);
	} else if (u > 1) {
		i = new Point(line.end);
	} else {
		i = new Point(line.start.x + u * dx, line.start.y + u * dy);
	}
	return new Line(i, pt);
}

// returns rectangle of intersection
intersect.util.rectAndRect = function(rect1, rect2) {
	if (intersect.rectAndRect(rect1, rect2)) {
		var x1 = Math.max(rect1.x, rect2.x),
			y1 = Math.max(rect1.y, rect2.y),
			x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width),
			y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
		return new Rect(x, y, x2 - x1, y2 - y1);
	}
	return null;
}
