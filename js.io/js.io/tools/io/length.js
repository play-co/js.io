/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.io.length');

LengthReader = function() {
    var self = this;
    var buff = "";
    var length = 1;
    var cb = null;
    var separate_events = function() {
        if (buff.length >= length) {
            cb(buff.slice(0,length));
            buff = buff.slice(length);
            separate_events();
        }
    }
    self.set_length = function(len) {
        lenth = len;
    }
    self.set_cb = function(func) {
        cb = func;
    }
    self.read = function(data) {
        buff += data;
        separate_events();
    }
}

js.io.declare('js.io.tools.io.length.Reader',LengthReader,{});
