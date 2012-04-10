var FORMATS = [
	[60, 'just now', 1], // 60
	[120, '1 minute ago', 'just now'], // 60*2
	[3600, 'minutes', 60], // 60*60, 60
	[7200, '1 hour ago', '1 hour from now'], // 60*60*2
	[86400, 'hours', 3600], // 60*60*24, 60*60
	[172800, 'yesterday', 'tomorrow'], // 60*60*24*2
	[604800, 'days', 86400], // 60*60*24*7, 60*60*24
	[1209600, 'last week', 'next week'], // 60*60*24*7*4*2
	[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
	[4838400, 'last month', 'next month'], // 60*60*24*7*4*2
	[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
	[58060800, 'last year', 'next year'], // 60*60*24*7*4*12*2
	[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
	[5806080000, 'last century', 'next century'], // 60*60*24*7*4*12*100*2
	[58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
];

// based on http://webdesign.onyou.ch/2010/08/04/javascript-time-ago-pretty-date/
exports = function(dateString, formats, isLocal, offset) {
	formats = formats || FORMATS;
	offset = offset || 0;
	
	var date;
	if (dateString instanceof Date) {
		isLocal = false;
		date = dateString;
	} else if (typeof dateString == 'string') {
		var time = ('' + dateString).replace(/-/g, '/').replace(/[TZ]/g, ' ').replace(/^\s+|\s+$/g, '');
		if (time.charAt(time.length - 4) == '.') {
			time = time.substr(0, time.length - 4);
		}
		date = new Date(time);
	} else {
		isLocal = false;
		date = new Date(dateString);
	}

	var seconds = (new Date() - date - offset) / 1000 + (isLocal ? new Date().getTimezoneOffset() * 60 : 0);
	var postfix = 'ago', listChoice = 1;
	if (seconds < 0) {
		seconds = -seconds;
		postfix = 'from now';
		listChoice = 2;
	}
	
	if (seconds < 60) { return 'just now'; }
	
	for (var i = 0, format; format = FORMATS[i]; ++i) {
		if (seconds < format[0]) {
			return typeof format[2] == 'string'
				? format[listChoice]
				: (seconds / format[2] | 0) + ' ' + format[1] + ' ' + postfix;
		}
	}
	
	return date;
};
