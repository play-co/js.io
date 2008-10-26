/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.protocols.websocket');

function WebSocketClient() {
    var self = this;
    var conn = null;
    var reader = null;

    var onConnect = function() {

    }

    var onClose = function() {

    }

    var recv = function(data) {

    }

    self.connect = function(host, port) {

        // set reader

        reader.set_cb(recv);

        conn = new js.io.TCPSocket();
        conn.onread = reader.read;
        conn.onopen = onConnect;
        conn.onclose = onClose;
        conn.open(host, port, false);
    }

    self.read = function(data) {
        reader.read(data);
    }
}

js.io.declare('js.io.protocols.websocket.Client',WebSocketClient,{});
