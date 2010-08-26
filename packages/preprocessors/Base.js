exports = Class(function() {
	this.run = function(src) { return src; }
	this.install = function() { jsio.__jsio.addPreprocessor(this.__class__, bind(this, 'run')); }
});