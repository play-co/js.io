

exports.parseString = function(str){
	if (jsio.__env.name == 'browser'){
		// Is it IE? XXX TODO: test this on a Windows computer
		if (window.ActiveXObject){ 
			var parser = new ActiveXObject('Microsoft.XMLDOM');
			return parser.loadXML(str);
		} else {
			var parser = new DOMParser();
			return parser.parseFromString(str, 'text/xml');
		}
	}else if(jsio.__env.name == 'node'){
	};

};
