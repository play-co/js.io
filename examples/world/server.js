jsio('import net');
jsio('import .world.server as server');

logging.get('RTJPProtocol').setLevel(logging.DEBUG);
logging.get('world.server').setLevel(logging.LOG);

worldServer = new server.WorldServer();

var listener = net.listen(worldServer, 'postmessage', {
	clientUrl: 'index.html?transport=postmessage'
})
var oldOnMessage = listener._onMessage;
var monitor;
listener._onMessage = function(evt) {
	oldOnMessage.apply(listener, arguments);
	if (!monitor) { 
		monitor = document.body.appendChild(document.createElement('div'));
		monitor.className = 'monitor';
	}
	var msg = eval('(' + evt.data + ')');
	monitor.innerHTML = msg.type + (msg.payload ? ': ' + msg.payload : '') + '<hr />' + monitor.innerHTML;
}

onload = function() {
	document.body.appendChild(listener.getButton('index.html?transport=postmessage'));
}
