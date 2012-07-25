jsio('import math.util as util');

/**
 * @package math.array;
 *
 * Functions to manipulate one or more arrays in tandem.
 */

/**
 * Returns the weighted average
 */ 

exports.weightedAverage = function (a, w, n) {
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		s += a[i] * w;
	}
	return s / n;
}

/**
 * Subtract two arrays, (a - b)
 */

exports.subtract = function (a, b) {
	var length = a.length,
			diff = new Array(length);
	for (var i = 0; i < length; ++i) {
		diff[i] = a[i] - b[i];
	}
	return diff;
};

/**
 * Average an array.
 */

exports.average = function (a, n) {
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		s += a[i];
	}
	return s / n;
}

/**
 * Return the standard deviation of an array.
 */

exports.stddev = function (a, n) {
	var avg = exports.average(a, n);
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		var diff = (a[i] - avg);
		s += diff * diff;
	}
	return Math.sqrt(s / (n - 1));
}

/**
 * Shuffle an array. Takes an optional random seed.
 */

exports.shuffle = function(a, randGen) {
	var len = a.length;
	for (var i = 0; i < len; ++i) {
		var j = util.random(i, len, randGen),
			temp = a[j];
		a[j] = a[i];
		a[i] = temp;
	}
	return a;
}

/**
 * Rotate an array's elements left.
 */

exports.rotate = function(a, count) {
	var len = a.length,
		b = new Array(len),
		j = count % len;
	
	if (j < 0) {
		j = j % len;
		if (j) { j += len; }
	}
	
	for (var i = 0; i < len; ++i) {
		b[i] = a[j];
		j = (j + 1) % len;
	}
	
	return b;
}
