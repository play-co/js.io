import .Point;
import .Line;
import .Rect;

/**
 * @package math.geom.intersect
 */
var intersect = exports;

intersect.pointAndRect = intersect.ptAndRect = function (pt, rect) {
	var x = pt.x,
			y = pt.y;
	return (x >= rect.x &&
					x <= rect.x + rect.width &&
					y >= rect.y &&
					y <= rect.y + rect.height);
};

intersect.rectAndPoint = intersect.rectAndPt = function (rect, pt) {
	return intersect.pointAndRect(pt, rect);
};

intersect.pointAndCircle = intersect.ptAndCirc = function(pt, circle) {
	var dx = pt.x - circle.x,
			dy = pt.y - circle.y;
	return dx * dx + dy * dy < circle.radius * circle.radius;
};

intersect.circleAndPoint = intersect.circAndPt = function (circle, pt) {
	return intersect.pointAndCircle(pt, circle);
};

intersect.circleAndCircle = function(circle1, circle2) {
	var dx = circle2.x - circle1.x,
		dy = circle2.y - circle1.y;
	var radiusSum = circle1.radius + circle2.radius;
	return dx * dx + dy * dy <= radiusSum * radiusSum;
};

intersect.isRectAndRect = function (rect1, rect2) {
	return !((rect1.y + rect1.height < rect2.y) ||
					 (rect2.y + rect2.height < rect1.y) ||
					 (rect1.x + rect1.width < rect2.x) ||
					 (rect2.x + rect2.width < rect1.x));
};

intersect.circleAndRect = function(circle, rect) {
	if (intersect.pointAndRect(circle, rect)) {
		return true;
	}
	return (intersect.lineAndCircle(rect.getSide(1), circle) ||
					intersect.lineAndCircle(rect.getSide(2), circle) ||
					intersect.lineAndCircle(rect.getSide(3), circle) ||
					intersect.lineAndCircle(rect.getSide(4), circle));
};

intersect.rectAndCircle = function(rect, circle) {
	return intersect.circleAndRect(circle, rect);
};

intersect.lineAndCircle = function (line, circle) {
	var vec = intersect.pointToLine(circle, line);
	return vec.getMagnitude() < circle.radius;
};

intersect.circleAndLine = function (circle, line) {
	return intersect.lineAndCircle(line, circle);
};

// returns line from pt to nearest pt on line
intersect.pointToLine = intersect.ptToLine = function (pt, line) {
	var dx = (line.end.x - line.start.x),
			dy = (line.end.y - line.start.y),
			u = ((pt.x - line.start.x) * dx	// TODO can we abstract this from 2D to 2D/3D?
					 + (pt.y - line.start.y) * dy) / (dx * dx + dy * dy);

	var i;
	if (u < 0) {
		i = new Point(line.start);
	} else if (u > 1) {
		i = new Point(line.end);
	} else {
		i = new Point(line.start.x + u * dx, line.start.y + u * dy);
	}
	return new Line(i, pt);
};

// returns rectangle of intersection
intersect.rectAndRect = function (rect1, rect2) {
	import .Rect;
	return (intersect.rectAndRect = function(rect1, rect2) {
		if (rect1 === true) { return new Rect(rect2); }
		if (rect2 === true) { return new Rect(rect2); }

		if (intersect.isRectAndRect(rect1, rect2)) {
			var x1 = Math.max(rect1.x, rect2.x),
					y1 = Math.max(rect1.y, rect2.y),
					x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width),
					y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
			return new Rect(x1, y1, x2 - x1, y2 - y1);
		}
		return null;
	})(rect1, rect2);
}
