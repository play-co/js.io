var context = {x: 5};
if (typeof node != 'undefined') {
	console = {log: node.debug};
}

function assert(v, m) { !v ? console.log(m + ': failed') : console.log(m + ': success') }

with(context) {
	assert(typeof(x) != 'undefined', "Test basic with usage");
	
	function test() {
		assert(typeof(x) != 'undefined', "Test with function");
	}
	
	test2 = function() {
		assert(typeof(x) != 'undefined', "Test with anonymous function");
	}
	
	;(function() {
		function _test3() {
			assert(typeof(x) != 'undefined', "Test with function");		
		}
		test3 = _test3;
	})();
}

test();
test2();
test3();
