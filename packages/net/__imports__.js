exports.map = {
	'node': ['net.env.node.stdio'],
	'browser': ['net.env.browser.csp'],
	'mobile': []
}

exports.resolve = function(env, opts) {
	return exports.map[env] || [];
};
