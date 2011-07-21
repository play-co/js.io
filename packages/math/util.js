jsio('import lib.Enum as Enum');

exports.interpolate = function(a, b, x) { return a * (1 - x) + b * x; }

exports.random = function(a, b, rand) { return a + ((rand || Math.random)() * (b - a) | 0); }

exports.randomInclusive = function(a, b, rand) { return exports.random(a, b+1, rand); }
exports.rand = Math.random;
//FIXME integer is a reserved word XXX
exports.integer = exports.truncate = function(a) { return a | 0; }

exports.clip = function(num, min, max) { return Math.max(Math.min(num, max), min); }

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

round.alt = true;

Enum.call(round, 'ROUND_HALF_UP', 'ROUND_HALF_AWAY_FROM_ZERO', 'ROUND_HALF_TO_EVEN', 'ROUND_HALF_STOCHASTIC', 'ROUND_HALF_ALTERNATE');
