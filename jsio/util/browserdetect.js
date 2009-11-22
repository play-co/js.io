exports.BrowserDetect = new function() {
	var versionSearchString;
	var dataBrowser = [
		{
			string: navigator.userAgent,
			subString: "Chrome"
		},
		{
			string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/"
		},
		{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},
		{
			prop: window.opera,
			identity: "Opera"
		},
		{
			string: navigator.vendor,
			subString: "iCab"
		},
		{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},
		{
			string: navigator.userAgent,
			subString: "Firefox"
		},
		{
			string: navigator.vendor,
			subString: "Camino"
		},
		{		// for newer Netscapes (6+)
			string: navigator.userAgent,
			subString: "Netscape"
		},
		{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "IE",
			versionSearch: "MSIE"
		},
		{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},
		{ 		// for older Netscapes (4-)
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		}
	];
	
	var dataOS = [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},
		{
			string: navigator.platform,
			subString: "Mac"
		},
		{
			string: navigator.userAgent,
			subString: "iPhone",
			identity: "iPhone/iPod"
		},
		{
			string: navigator.platform,
			subString: "Linux"
		}
	];
	
	function searchString(data) {
		for (var i=0,item;item=data[i];i++)	{
			var dataString = item.string;
			var dataProp = item.prop;
			item.identity = item.identity || item.subString;
			versionSearchString = item.versionSearch || item.identity;
			if (dataString) {
				if (dataString.indexOf(item.subString) != -1)
					return item.identity;
			} else if (dataProp)
				return item.identity;
		}
	}
	
	function searchVersion(dataString) {
		var index = dataString.indexOf(versionSearchString);
		if (index == -1) return;
		return parseFloat(dataString.substring(index+versionSearchString.length+1));
	}
	
	this.browser = searchString(dataBrowser) || "unknown";
	this.version = searchVersion(navigator.userAgent)
		|| searchVersion(navigator.appVersion)
		|| "unknown";
	this.OS = searchString(dataOS) || "unknown";
	this.isWebKit = RegExp(" AppleWebKit/").test(navigator.userAgent);
	this['is'+this.browser] = this.version;
};