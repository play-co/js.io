js.io.require('js.io.protocols.websocket');

var client;

function show(msg) {
    var d = document.createElement('div');
    d.innerHTML = msg;
    document.getElementById('display').appendChild(d);
}

function send() {
    var msg = document.getElementById('text').value;
    show('sent: '+msg);
    client.postMessage(msg);
}

function start() {
    show('connecting...');
    client = new js.io.protocols.websocket.Client('ws://localhost:81');
    client.onopen = function() { show('connection open'); }
    client.onmessage = function(msg) { show('received: '+msg); }
    client.onclosed = function() { show('connection closed'); }
}
