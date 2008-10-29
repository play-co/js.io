/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.ui.tabcompletion');

TabCompletion = function() {
    var self = this;
    var words = [];
    self.reset_words = function() {
        words = [];
    }
    self.set_words = function(w) {
        words = w;
    }
    self.add_words = function(w) {
        words = words.concat(w);
    }
    self.complete = function(str) {
        for (var i = 0; i < words.length; i++) {
            if (str == words[i].slice(0,str.length)) {
                return words[i];
            }
        }
        return str;
    }
}

js.io.declare('js.io.tools.ui.tabcompletion.TabCompletion',TabCompletion,{});
