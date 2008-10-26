/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.io.jsonreader');

JSONReader = function() {
    var chars = {'[':']','{':'}','"':'"'};
    var self = this;
    var cb = null;
    var unclosed = [];
    var buff = "";
    var checked = 0;
    var separate_events = function() {
        while (buff.length > checked) {
            if (unclosed.length > 0 && buff[checked] == unclosed[unclosed.length-1]) {
                unclosed.pop();
            }
            else if (buff[checked] in chars) {
                unclosed.push(chars[buff[checked]]);
            }
            checked += 1;
            if (buff && unclosed.length == 0) {
                cb(eval("("+buff.slice(0,checked)+")"));
                buff = buff.slice(checked);
                checked = 0;
            }
        }
    }
    self.set_cb = function(func) {
        cb = func;
    }
    self.read = function(data) {
        buff += data;
        separate_events();
    }
}

js.io.declare('js.io.tools.io.jsonreader.Reader',JSONReader,{});
