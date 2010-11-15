var PI = Math.PI,
	TWOPI = Math.PI * 2;

exports.average = function(a, b, weight) {
	if (weight === undefined) { weight = 0.5; }
	var r1 = exports.getRange(a, b);
	var avg = r1 < PI 
		? a + r1 * (1 - weight)
		: b + (2 * PI - r1) * weight;

	return avg > PI ? avg - 2 * PI : avg < -PI ? avg + 2 * PI : avg;
}

// between -PI and PI
exports.normalize = function(a) {
	
	// TODO: don't use loops
	while(a < -PI) { a += PI; }
	while(a > PI) { a -= PI; }
	return a;
}

exports.add = function(a, b) {
	var sum = a + b;
	return sum > PI ? sum - TWOPI : sum < -PI ? sum + TWOPI : sum;
}

// smaller of two angles a - b, b - a
exports.difference = function(a, b) {
	var diff = exports.getRange(a, b);
	return diff > PI ? diff - TWOPI : diff;
}

// angular range from a to b, returns float between [0, 2PI]
exports.getRange = function(a, b) {
	var r = b - a;
	return r < 0 ? r + TWOPI : r;
}
