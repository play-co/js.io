/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.ui.inputmemory');

InputMemory = function() {
    var self = this;
    var max = 10;
    var index = 10;
    var cache = ["","","","","","","","","",""];
    var rotate = function() {
        if (index == max) {
            return "";
        }
        else {
            return cache[index];
        }
    }
    self.set_size = function(s) {
        max = s;
        index = s;
        cache = [];
        for (var i = 0; i < s; i++) {
            cache.push("");
        }
    }
    self.remember = function(s) {
        index = max;
        for (var i = 0; i < max; i++) {
            if (cache[i] == s) {
                cache = cache.slice(0,i).concat(cache.slice(i+1,max));
                break;
            }
        }
        cache.push(s);
        if (cache.length > max) {
            cache = cache.slice(1);
        }
    }
    self.up = function() {
        index -= 1;
        if (index == -1) {
            index = max;
        }
        return rotate();
    }
    self.down = function() {
        index += 1;
        if (index > max) {
            index = 0;
        }
        return rotate();
    }
}

js.io.declare('js.io.tools.ui.inputmemory.InputMemory',InputMemory,{});
