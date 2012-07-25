jsio('import lib.Enum as Enum');

/**
 * @package math.util;
 */

/**
 * Interpolate between values a and b at the point x in the interval.
 */

exports.interpolate = function(a, b, x) { return a * (1 - x) + b * x; }

/**
 * Return a random integer between a and b. Optionally, a random seed can be
 * given.
 */

exports.random = function(a, b, rand) { return a + ((rand || Math.random)() * (b - a) | 0); }

/**
 * Return a random integer between a and b, inclusive. Optionally, a random seed
 * can be given.
 */

exports.randomInclusive = function(a, b, rand) { return exports.random(a, b+1, rand); }

/**
 * Return a value where min <= num <= max.
 */

exports.clip = function(num, min, max) { return Math.max(Math.min(num, max), min); }

/**
 * Return the sign of a number.
 */

exports.sign = function (num) {
	return num && num / Math.abs(num);
};

/**
 * Rounding a value with the given precision, given the provided rounding
 * method.
 */

var round = exports.round = function(a, precision, method) {
	if (!method || method == round.ROUND_HALF_AWAY_FROM_ZERO) {
		return a.toFixed(precision);
	}
	
	if(!precision) {
		if (method == round.ROUND_HALF_UP) { Math.round(a); }
	
		//FIXME integer is a reserved word XXX	
		var integer = a | 0,
			frac = a - integer 
			half = frac == 0.5 || frac == -0.5;
		if (!half) { return Math.round(a); }
		
		var sign = a < 0 ? -1 : 1;
		switch(method) {
			case round.ROUND_HALF_TO_EVEN:
				return integer % 2 ? integer + sign : integer 
			case round.ROUND_HALF_TO_ODD:
				return integer % 2 ? integer : integer + sign;
			case round.ROUND_HALF_STOCHASTIC:
				return Math.random() < 0.5 ? integer + sign : integer 
			case round.ROUND_HALF_ALTERNATE:
				return (round.alt = !round.alt) ? integer + sign : integer 
		}
	}
	
	var integer = a | 0,
		frac = a - integer 
		p = Math.pow(10, precision);
	return (integer + round(frac * p, 0, method) / p).toFixed(precision);
}

/**
 * Available rounding possibilities.
 */

Enum.call(round, 'ROUND_HALF_UP', 'ROUND_HALF_AWAY_FROM_ZERO', 'ROUND_HALF_TO_EVEN', 'ROUND_HALF_TO_ODD', 'ROUND_HALF_STOCHASTIC', 'ROUND_HALF_ALTERNATE');

/**
 * Alternating flag for rounding strategy ROUND_HALF_ALTERNATE.
 */

round.alt = true;
