exports.add = exports.translate = function(pt, dx, dy) {
	return typeof dx == 'number' ?
		{
			x: pt.x + dx,
			y: pt.y + dy
		}
		: {
			x: pt.x + dx.x,
			y: pt.y + dx.y
		};
}

exports.subtract = function(pt, dx, dy) {
	return typeof dx == 'number' ?
		{
			x: pt.x - dx,
			y: pt.y - dy
		}
		: {
			x: pt.x - dx.x,
			y: pt.y - dx.y
		};
}

exports.scale = function(s, pt) {
	return {
		x: pt.x * s,
		y: pt.y * s
	};
}

exports.addMagnitude = function(pt, m) {
	return exports.setMagnitude(pt, exports.getMagnitude(pt) + m);
}

exports.setMagnitude = function(pt, m) {
	var theta = Math.atan2(pt.y, pt.x);
	return {
		x: m * Math.cos(theta),
		y: m * Math.sin(theta)
	};
}

exports.getMagnitude = function(pt) {
	return Math.sqrt(pt.x * pt.x + pt.y * pt.y);
}

exports.rotate = function(pt, r) {
	var x = pt.x,
		y = pt.y,
		cosr = Math.cos(r),
		sinr = Math.sin(r);
	
	return {
		x: x * cosr - y * sinr,
		y: x * sinr + y * cosr
	};
}

exports.inBox = function(pt, x1, y1, x2, y2) { return pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2; }