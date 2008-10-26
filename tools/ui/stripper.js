/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.ui.stripper');

Stripper = function() {
    var self = this;
    var LOWER = 'abcdefghijklmnopqrstuvwxyz';
    var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var ALPHA = LOWER+UPPER;
    var NUMS = '0123456789';
    var ALL = ALPHA+NUMS;
    var process = function(initial, allowed, extra) {
        if (extra) {
            allowed += extra;
        }
        var s = '';
        for (var i=0;i<initial.length;i++) {
            if (allowed.indexOf(initial[i]) != -1) {
                s += initial[i];
            }
        }
        return s;
    }
    self.lower = function(s, extra) {
        return process(s, LOWER, extra);
    }
    self.upper = function(s, extra) {
        return process(s, UPPER, extra);
    }
    self.alpha = function(s, extra) {
        return process(s, ALPHA, extra);
    }
    self.numbers = function(s, extra) {
        return process(s, NUMS, extra);
    }
    self.alphanum = function(s, extra) {
        return process(s, ALL, extra);
    }
    self.strip = function(s) {
        while (s && s[0] == " ") {
            s = s.slice(1);
        }
        while (s && s[s.length-1] == " ") {
            s = s.slice(0, s.length-1);
        }
        return s;
    }
}

js.io.declare('js.io.tools.ui.stripper.Stripper',Stripper,{});
