"use import";

var zeroPadding = [];
function ensurePadding(n) {
	for (var i = zeroPadding.length; i < n; ++i) {
		var str = [];
		for (var j = 0; j < i; ++j) { str.push('0'); }
		zeroPadding[i] = str.join('');
	}
}

/**
 * Here we handle arbitrary sorting indexes transparently converting numbers to strings
 * for efficient sorting with toString.  Unfortunately, this does not work for large floating
 * point values, but that functionality could theoretically be added if desired.
 */
function sortIndex(i) { return this[i]; }

exports = function(arr, indexer) {
	
	var len = arr.length,
		index = new Array(len),
		result = new Array(len),
		toString = new Array(len),
		indexers = Array.prototype.slice.call(arguments, 1),
		haveMultiple = !!indexers[1];
	
	if (haveMultiple) {
		for (var i = 0; i < len; ++i) {
			result[i] = [];
		}
	}
	
	for (var k = 0, indexer; indexer = indexers[k]; ++k) {
		for (var i = 0; i < len; ++i) {
			index[i] = indexer.call(arr[i], i);
		}
		
		if (typeof index[0] == 'number') {
			// we do two passes here:
			//  1: find the max and min numerical indices
			//  2: convert the indices to strings with appropriate zero-padding
			var largest = index[0],
				smallest = index[0];

			for (var i = 1; i < len; ++i) {
				if (index[i] > largest) {
					largest = index[i];
				} else if (index[i] < smallest) {
					smallest = index[i];
				}
			}

			// we have to be very careful here - large floating point numbers will break the
			// string padding code
			var paddingPositive = String(Math.floor(largest)).length,
				paddingNegative = String(Math.floor(smallest)).length;

			ensurePadding(Math.max(paddingPositive, paddingNegative));

			var strLen;
			for (var i = 0; i < len; ++i) {
				var val = index[i];
				if (val < 0) {
					val = -(smallest - val);
					strLen = ('' + Math.floor(val)).length;
					index[i] = '-' + zeroPadding[paddingNegative - strLen] + val;
				} else {
					strLen = ('' + Math.floor(val)).length;
					index[i] = zeroPadding[paddingPositive - strLen] + val;
				}
			}
		}
		
		if (haveMultiple) {
			for (var i = 0; i < len; ++i) {
				result[i].push(index[i]);
			}
		} else {
			result = index;
		}
	}
	
	for (var i = 0; i < len; ++i) {
		if (haveMultiple) {
			result[i] = result[i].join('|');
		}
		
		toString[i] = arr[i].hasOwnProperty('toString') && arr[i].toString || null;
		arr[i].toString = bind(result, sortIndex, i);
	}
	
	Array.prototype.sort.apply(arr);
	
	for (var i = 0; i < len; ++i) {
		if (toString[i]) {
			arr[i].toString = toString[i];
		} else {
			delete arr[i].toString;
		}
	}
}
