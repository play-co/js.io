exports.map = {
	'node': [
		'net.env.node.stdio'
	],
	'browser': [
		'net.env.browser.csp',
		'net.env.browser.postmessage',
		'net.env.browser.websocket',
		'net.env.browser.socketio'
	],
	'mobile': []
}

exports.resolve = function(env, opts) {
	return exports.map[env] || [];
};
