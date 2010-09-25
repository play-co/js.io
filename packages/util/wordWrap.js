exports = function(str, maxWidth, prefix, tabWidth) {
	prefix = prefix || '';
	maxWidth -= exports.getLengthWithTabs(prefix, tabWidth);
	
	if (!maxWidth) { return prefix + str; }
	
	var words = str.split(' '),
		numWords = words.length,
		lines = [{
			str: [],
			len: 0
		}],
		i = 0;
	
	function finalize() {
		lines[i] = prefix + curLine.str.join(' ');
		++i;
	}
	
	var curLine = lines[i];
	for (var j = 0; j < numWords; ++j) {
		var word = words[j],
			wordLen = word.length;
		if (curLine.len && curLine.len + wordLen + 1 > maxWidth) {
			finalize();
			curLine = lines[i] = {str: [word], len: wordLen};
		} else {
			curLine.str.push(word);
			if (curLine.len) { curLine.len++; }
			curLine.len += wordLen;
		}
	}
	
	if (curLine.len) {
		finalize();
	} else {
		lines.pop();
	}
	
	return lines.join('\n');
}

exports.getLengthWithTabs = function(str, tabWidth) {
	var tabs = 0;
	str = str.replace(/\t/g, function() { ++tabs; });
	return str.length + tabs * (tabWidth || 8);
}
