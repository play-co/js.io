"use import";

import .LogClass;

exports = LogClass('lib.Sortable', function(logger) {
	
	this.toStringPush = function(indexer) {
		if (!this._toString) {
			this._toString = [this.toString];
		} else {
			this._toString.push(this.toString);
		}
		
		this.toString = indexer;
	}
	
	this.toStringPop = function() {
		this.toString = this._toString.pop();
	}
});

exports.sort = function(arr, indexer) {
	
	var len = arr.length;
	for (var i = 0; i < len; ++i) {
		arr[i].toStringPush(indexer);
	}
	
	arr.sort();
	
	for (var i = 0; i < len; ++i) {
		arr[i].toStringPop(indexer);
	}
}
