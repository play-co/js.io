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