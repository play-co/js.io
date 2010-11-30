jsio('import lib.Enum as Enum');

exports.interpolate = function(a, b, x) { return a * (1 - x) + b * x; }

exports.random = function(a, b, rand) { return a + ((rand || Math.random)() * (b - a) | 0); }
exports.rand = Math.random;
exports.int = exports.truncate = function(a) { return a | 0; }

var round = exports.round = function(a, precision, method) {
	if (!method || method == round.ROUND_HALF_AWAY_FROM_ZERO) {
		return a.toFixed(precision);
	}
	
	if(!precision) {
		if (method == round.ROUND_HALF_UP) { Math.round(a); }
		
		var int = a | 0,
			frac = a - int,
			half = frac == 0.5 || frac == -0.5;
		if (!half) { return Math.round(a); }
		
		var sign = a < 0 ? -1 : 1;
		switch(method) {
			case round.ROUND_HALF_TO_EVEN:
				return int % 2 ? int + sign : int;
			case round.ROUND_HALF_TO_ODD:
				return int % 2 ? int : int + sign;
			case round.ROUND_HALF_STOCHASTIC:
				return Math.random() < 0.5 ? int + sign : int;
			case round.ROUND_HALF_ALTERNATE:
				return (round.alt = !round.alt) ? int + sign : int;
		}
	}
	
	var int = a | 0,
		frac = a - int,
		p = Math.pow(10, precision);
	return (int + round(frac * p, 0, method) / p).toFixed(precision);
}

round.alt = true;

Enum.call(round, 'ROUND_HALF_UP', 'ROUND_HALF_AWAY_FROM_ZERO', 'ROUND_HALF_TO_EVEN', 'ROUND_HALF_STOCHASTIC', 'ROUND_HALF_ALTERNATE');
