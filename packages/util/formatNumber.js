exports.integer = function(number, prefix, unitPlural, unitSingular) {
	prefix = prefix || '';
	if (unitPlural) {
		unitPlural = ' ' + unitPlural;
	} else {
		unitPlural = '';
	}
	
	if (unitSingular) {
		unitSingular = ' ' + unitSingular;
	} else {
		unitSingular = unitPlural;
	}
	
	var arr = ('' + Math.round(number)).split('');
	var n = arr.length;
	
	if (number == 1) {
		return prefix + 1 + unitSingular;
	} else if (n > 3) {
		for (var i = arr.length - 1; i > 0; --i) {
			if ((n - i) % 3 == 0) {
				arr.splice(i, 0, ',');
			}
		}
	}
	
	return prefix + arr.join('') + unitPlural;
}
