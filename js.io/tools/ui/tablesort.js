/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.ui.tablesort');

TableSort = function() {
    var self = this;
    var col = 0;
    var mode = 'num';
    var higher = function(p1, p2) {
        if (mode == "num") {
            return parseInt(p1.childNodes[col].innerHTML) > parseInt(p2.childNodes[col].innerHTML);
        }
        if (mode == "alpha") {
            return [p1.childNodes[col], p2.childNodes[col]].sort()[0] != p2.childNodes[col];
        }
    }
    self.set_mode_alpha = function() {
        mode = 'alpha';
    }
    self.set_mode_num = function() {
        mode = 'num';
    }
    self.set_column = function(num) {
        col = num;
    }
    self.adjust = function(row) {
        var up = row.previousSibling;
        var down = row.nextSibling;
        var all = row.parentNode;
        if (up && higher(row, up)) {
            all.insertBefore(row, up);
        }
        else if (down && higher(down, row)) {
            all.insertBefore(down, row);
        }
        else {
            return;
        }
        self.adjust(row);
    }
}

js.io.declare('js.io.tools.ui.tablesort.TableSort',TableSort,{});
