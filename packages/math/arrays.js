jsio('import .util');

exports.weightedAverage = function (a, w, n) {
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		s += a[i] * w;
	}
	return s / n;
}

exports.subtract = function(a, b) {
	var length = a.length,
		diff = new Array(length);
	for (var i = 0; i < length; ++i) {
		diff[i] = b[i] - a[i];
	}
	return diff;
}

exports.average = function (a, n) {
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		s += a[i];
	}
	return s / n;
}

exports.stddev = function (a, n) {
	var avg = exports.average(a, n);
	n = n || a.length;
	var s = 0;
	for (var i = n - 1; i >= 0; --i) {
		var diff = (a[i] - avg);
		s += diff * diff;
	}
	return Math.sqrt(sum / (1 - n));
}

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

exports.rotate = function(a, count) {
	var len = a.length,
		b = new Array(len),
		j = count % len;
	
	if (j < 0) {
		j = j % len;
		if (j) { j %= len; }
	}
	
	for (var i = 0; i < len; ++i) {
		b[i] = a[j];
		j = (j + 1) % len;
	}
	
	return b;
}
