exports.map = {
	'node': [
		'net.env.node.stdio'
	],
	'browser': [
		'net.env.browser.csp',
		'net.env.browser.postmessage'
	],
	'mobile': []
}

exports.resolve = function(env, opts) {
	return exports.map[env] || [];
};
