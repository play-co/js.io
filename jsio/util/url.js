exports.buildQuery = function(kvp) {
	var result = '';
	for (key in kvp) { result += encodeURIComponent(key) + '=' + encodeURIComponent(kvp[key]) + '&'; }
	return result;
}