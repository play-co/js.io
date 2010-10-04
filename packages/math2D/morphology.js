

exports.open = function(img, mask) {
	return exports.dilate(exports.erode(img, mask), mask);
}

exports.close = function(img, mask) {
	return exports.erode(exports.dilate(img, mask), mask);
}

exports.getSquareMask = function(d) {
	if (d % 2 == 0) { d++; }
	var mask = [];
	for (var x = 0; x < d; ++x) {
		mask[x] = [];
		for (var y = 0; y < d; ++y) {
			mask[x][y] = 1;
		}
	}
	return mask;
}

exports.getCircleMask = function(d) {
	if (d % 2 == 0) { d++; }
	var mask = [],
		r = d / 2 - 0.5,
		c = r;
	for (var y = 0; y < d; ++y) {
		mask[y] = [];
		for (var x = 0; x < d; ++x) {
			var dx = x - c, dy = y - c;
			mask[y][x] = Math.sqrt(dx * dx + dy * dy) <= r ? 1 : 0;
		}
	}
	return mask;
}

exports.multiply = function(img1, c) {
	var w = img1.width, h = img1.height;
	for (var y = 0; y < h; ++y) {
		for (var x = 0; x < w; ++x) {
			img1[y][x] *= c;
		}
	}
	return img1;
}

exports.subtract = function(img1, img2) {
	var w = Math.min(img1.width, img2.width),
		h = Math.min(img1.height, img2.height);
		
	for (var y = 0; y < h; ++y) {
		for (var x = 0; x < w; ++x) {
			img1[y][x] -= img2[y][x];
		}
	}
	return img1;
}

exports.erode = function(img, mask) {
	logger.info('erode');
	
	var lmx = (mask.length - 1) / 2,
		lmy = (mask[0].length - 1) / 2,
		out = [],
		w = img.width,
		h = img.height;
	
	out.width = w;
	out.height = h;
	
	for (var y = 0; y < h; ++y) {
		out[y] = [];
		for (var x = 0; x < w; ++x) {
			var count = true;
			for (var mx = -lmx; mx < lmx + 1; ++mx) {
				for (var my = -lmy; my < lmy + 1; ++my) {
					var sx = x + mx, sy = y + my;
					mask[my + lmy][mx + lmx]
						&& (count &= sx >= 0 && sx < w && sy >= 0 && sy < h && img[sy][sx]);
				}
			}
			out[y][x] = count && 255;
		}
	}
	return out;
}

exports.dilate = function (img, mask) {
	logger.info('dilate');
	
	var lmx = (mask.length - 1) / 2,
		lmy = (mask[0].length - 1) / 2,
		out = [],
		w = img.width,
		h = img.height;
	
	out.width = w;
	out.height = h;
	
	for (var y = 0; y < h; ++y) {
		out[y] = [];
		for (var x = 0; x < w; ++x) {
			var count = false;
			for (var mx = -lmx; mx < lmx + 1; ++mx) {
				for (var my = -lmy; my < lmy + 1; ++my) {
					var sx = x + mx, sy = y + my;
					count |= sx >= 0 && sx < w && sy >= 0 && sy < h
						&& mask[my + lmy][mx + lmx] && img[sy][sx];
				}
			}
			out[y][x] = count && 255;
		}
	}
	return out;
}
