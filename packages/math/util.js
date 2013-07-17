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
 * An actual modulo operator.
 */
exports.mod = function(m, n) {
    return ((m % n) + n) % n;
};

/**
 * Rounding a value with the given precision, given the provided rounding method.
 * NOTE: Number.toFixed returns a string, I'm not sure this is desired.
 
 ### util.round (n [, precision, method])
 1. `n {number} value`
 2. `precision {number} = null` ---Optional.
 3. `method {number}` ---Optional enum from `util.round`.
 4. Return `{number}`
 
 Round a number to a given precision, or by a given method.
 
 The precision method can be one of the following:
 
   * `util.round.ROUND_HALF_UP` ---Round 0.5 to 1.
   * `util.round.ROUND_HALF_AWAY_FROM_ZERO`
   * `util.round.ROUND_HALF_TO_EVEN` ---Round to the nearest even number.
   * `util.round.ROUND_HALF_TO_ODD` ---Round to the nearest odd number.
   * `util.round.ROUND_HALF_STOCHASTIC` ---Round at random.
   * `util.round.ROUND_HALF_ALTERNATE` ---Alternate rounding up/down with sequential uses of this function.
 *
 */

var round = exports.round = function(a, precision, method) {
	if (!method || method == round.ROUND_HALF_AWAY_FROM_ZERO) {
		return a.toFixed(precision);
	}
	
	if(!precision) {
		if (method == round.ROUND_HALF_UP) { Math.round(a); }
	
		var i = a | 0,
				frac = a - i,
				half = frac == 0.5 || frac == -0.5;
		if (!half) { return Math.round(a); }
		
		var sign = a < 0 ? -1 : 1;
		switch(method) {
			case round.ROUND_HALF_TO_EVEN:
				return i % 2 ? i + sign : i;
			case round.ROUND_HALF_TO_ODD:
				return i % 2 ? i : i + sign;
			case round.ROUND_HALF_STOCHASTIC:
				return Math.random() < 0.5 ? i + sign : i;
			case round.ROUND_HALF_ALTERNATE:
				return (round.alt = !round.alt) ? i + sign : i;
		}
	}
	
	var i = a | 0,
			frac = a - i,
			p = Math.pow(10, precision);
	return (i + round(frac * p, 0, method) / p).toFixed(precision);
}

/**
 * Available rounding possibilities.
 */

Enum.call(round, 'ROUND_HALF_UP', 'ROUND_HALF_AWAY_FROM_ZERO', 'ROUND_HALF_TO_EVEN', 'ROUND_HALF_TO_ODD', 'ROUND_HALF_STOCHASTIC', 'ROUND_HALF_ALTERNATE');

/**
 * Alternating flag for rounding strategy ROUND_HALF_ALTERNATE.
 */

round.alt = true;
