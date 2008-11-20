/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.io.xml');

XMLReader = function() {
    var self = this;
    var parse = null;
    var cb = null;
    var name = null;
    var buff = "";
    var checked = 0;
    var get_parser = function() {
        try {
            var parser = new DOMParser();
            parse = function(s) {
                return parser.parseFromString(s, "text/xml");
            }
        }
        catch(e) {
            try {
                var parser = new ActiveXObject("Microsoft.XMLDOM");
                parser.async = "false";
                parse = parser.loadXML;
            }
            catch(e) {
                alert("can't find suitable XML parser! what kind of crazy browser are you using?");
            }
        }
    }
    var separate_events = function() {
        if (!name) {
            if (!buff) {
                return;
            }
            if (buff[0] != "<") {
                checked = 0;
                buff = buff.slice(1);
                return separate_events();
            }
            close_index = buff.indexOf(">");
            if (close_index == -1) {
                return;
            }
            if (buff[close_index-1] == "/") {
                var frame = parse(buff.slice(0,close_index+1)).firstChild;
                buff = buff.slice(close_index+1);
                checked = 0;
                cb(frame);
                return separate_events();
            }
            name = buff.slice(1,close_index);
            var s = name.indexOf(" ");
            if (s != -1) {
                name = name.slice(0,s);
            }
            checked = close_index+1;
        }
        var i = buff.indexOf(">", checked);
        while (i != -1) {
            if (buff.slice(i-2-name.length,i+1) == "</"+name+">") {
                var frame = parse(buff.slice(0, i+1)).firstChild;
                if (frame.nodeName == "parsererror") {
                    var frame = parse(buff.slice(0, i+1).replace("&","&amp;")).firstChild;
                }
                buff = buff.slice(i+1);
                checked = 0;
                name = null;
                cb(frame);
                return separate_events();
            }
            else {
                checked = i+1;
                i = buff.indexOf(">", checked);
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
    get_parser();
}

js.io.declare('js.io.tools.io.xml.Reader',XMLReader,{});