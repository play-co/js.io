/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.require('js.io.protocols.mics');
js.io.require('js.io.tools.ui.stripper');

OPCOL = {'white':'black','black':'white'};

function Clock() {
    var WHITE = document.getElementById('white');
    var BLACK = document.getElementById('black');
    var self = this;
    var on = false;
    var increment = null;
    var timeout_cb = null;
    var timer = null;
    var time = {'white':300,'black':300}
    var turn = 'white';
    var enemy = 'black';
    var display = function() {
        WHITE.innerHTML = self.minutize(time['white']);
        BLACK.innerHTML = self.minutize(time['black']);
    }
    var update = function() {
        time[turn] -= 1;
        display();
        if (turn == enemy && time[turn] < 0) {
            timeout_cb();
        }
    }
    var start = function() {
        on = true;
        timer = setInterval(update, 1000);
    }
    self.minutize = function(s) {
        var m = 0;
        while (s > 59) {
            s -= 60;
            m += 1;
        }
        if (s < 10) {
            if (s < 0) {
                s = '0';
            }
            s = '0'+s;
        }
        return m+':'+s;
    }
    self.set_timeout_cb = function(cb) {
        timeout_cb = cb;
    }
    self.set = function(initial, inc, color) {
        turn = 'white';
        enemy = OPCOL[color];
        time['white'] = initial;
        time['black'] = initial;
        increment = inc;
        display();
    }
    self.stop = function() {
        on = false;
        clearInterval(timer);
    }
    self.change = function() {
        turn = OPCOL[turn];
        if (! on) { start(); }
    }
    self.sync = function(w, b) {
        time['white'] = Math.round(w);
        time['black'] = Math.round(b);
    }
}

function Board() {
    var LETTERS = 'abcdefgh';
    var BOARD = document.getElementById('board');
    var BLACK = '#744528';
    var WHITE = '#cca655';
    var PROMOTIONS = {
    'white': {
            'Q':'&#9813;',
            'R':'&#9814;',
            'B':'&#9815;',
            'N':'&#9816;'
        },
    'black': {
            'Q':'&#9819;',
            'R':'&#9820;',
            'B':'&#9821;',
            'N':'&#9822;'
        }
    }
    var PIECES = {
    'white': [9812,9813,9814,9815,9816,9817],
    'black': [9818,9819,9820,9821,9822,9823]
    }
    var START = [
              ['&#9820;','&#9822;','&#9821;','&#9819;','&#9818;','&#9821;','&#9822;','&#9820;'],
              ['&#9823;','&#9823;','&#9823;','&#9823;','&#9823;','&#9823;','&#9823;','&#9823;'],
              ['','','','','','','',''],
              ['','','','','','','',''],
              ['','','','','','','',''],
              ['','','','','','','',''],
              ['&#9817;','&#9817;','&#9817;','&#9817;','&#9817;','&#9817;','&#9817;','&#9817;'],
              ['&#9814;','&#9816;','&#9815;','&#9813;','&#9812;','&#9815;','&#9816;','&#9814;']]
    var self = this;
    var color = null;
    var move_cb = null;
    var squares = {};
    var click_one = null;
    var turn = 'white';
    var get_coordinates = function(row,col) {
        if (color=='white') {
            return LETTERS[col] + (8-row);
        }
        else {
            return LETTERS[7-col] + (row+1);
        }
    }
    self.is_pawn = function(square_id) {
        var p = squares[square_id].innerHTML.charCodeAt(0);
        return p == 9817 || p == 9823;
    }
    self.is_king = function(square_id) {
        var p = squares[square_id].innerHTML.charCodeAt(0);
        return p == 9812 || p == 9818;
    }
    self.set_move_cb = function(cb) {
        move_cb = cb;
    }
    self.reset = function(c) {
        color = c;
        BOARD.innerHTML = '';
        for (var x=0; x<8; x++) {
            var r = document.createElement('tr');
            for (var y=0; y<8; y++) {
                var d = document.createElement('td');
                if (color == 'white') {
                    d.innerHTML = START[x][y];
                }
                else {
                    d.innerHTML = START[7-x][7-y];
                }
                if ((x+y)%2) {
                    d.class = BLACK;
                }
                else {
                    d.class = WHITE;
                }
                d.style.background = d.class;
                var coordinates = get_coordinates(x,y);
                d.id = coordinates;
                squares[coordinates] = d;
                d.onclick = Function("chess.click_event('"+coordinates+"')");
                r.appendChild(d);
            }
            BOARD.appendChild(r);
        }
    }
    self.click_event = function(square_id) {
        var square = squares[square_id];
        var piece = square.innerHTML.charCodeAt(0);
        if (click_one) {
            if (PIECES[color].indexOf(piece) == -1) {
                move_cb(click_one.id, square_id);
            }
            click_one.style.background = click_one.class;
            click_one = null;
        }
        else if (PIECES[color].indexOf(piece) != -1) {
            square.style.background = "green";
            click_one = square;
        }
    }
    self.is_castling = function(f, t) {
        var diff = f[0] - t[0];
        return diff == -2 || diff == 2;
    }
    self.move = function(f, t, p) {
        if (self.is_pawn(f)) {
            if (p) { // promotion
                squares[t].innerHTML = PROMOTIONS[turn][p];
            }
            else { // en passant
                if (f[0] != t[0] && ! squares[t].innerHTML) {
                    squares[t[0]+f[1]].innerHTML = '';
                }
                squares[t].innerHTML = squares[f].innerHTML;
            }
        }
        else {
            squares[t].innerHTML = squares[f].innerHTML;
        }
        if (self.is_king(t)) { // check for castle
            var diff = LETTERS.indexOf(f[0]) - LETTERS.indexOf(t[0]);
            if (diff == -2) { // kingside
                squares['f'+f[1]].innerHTML = squares['h'+f[1]].innerHTML;
                squares['h'+f[1]].innerHTML = '';
            }
            else if (diff == 2) { // queenside
                squares['d'+f[1]].innerHTML = squares['a'+f[1]].innerHTML;
                squares['a'+f[1]].innerHTML = '';
            }
        }
        squares[f].innerHTML = '';
        turn = OPCOL[turn];
    }
}

function Chess() {
    var OUTPUT = document.getElementById('output');
    var INPUT = document.getElementById('input');
    var ENTER_KEY = 13;
    var INITIAL_TIMES = ['2','5','10','20'];
    var INCREMENT_TIMES = ['0','2','5','12'];
    var self = this;
    var name = null;
    var curr_move = [null, null, null];
    var color = 'white';
    var stripper = new js.io.tools.ui.stripper.Stripper();
    var client = new js.io.protocols.mics.Client();
    var clock = new Clock();
    board = new Board();
    var new_game = function(c, ini, inc) {
        color = c;
        board.reset(color);
        clock.set(ini, inc, color);
        notice('new game found');
        notice('you are '+color);
    }
    var gameover = function(outcome, reason) {
        clock.stop();
        notice('game over');
        notice(outcome+" ("+reason+")");
    }
    var list = function(n, ini, inc) {
        notice(n+" seeks "+clock.minutize(ini)+" "+inc+" game");
    }
    var output = function(data) {
        OUTPUT.appendChild(data);
        OUTPUT.scrollTop = OUTPUT.scrollHeight;
    }
    var post_chat = function(n, m) {
        var d = document.createElement('div');
        d.className = 'chat';
        d.innerHTML = "<b>"+n+":</b> "+m;
        output(d);
    }
    var notice = function(n) {
        var d = document.createElement('div');
        d.className = 'notice';
        d.innerHTML = n;
        output(d);
    }
    var clean = function(s, e) {
        return stripper.strip(stripper.alpha(s, e));
    }
    var move = function(f, t) {
        p = null;
        if ((t[1] == '1' || t[1] == '8') && board.is_pawn(f)) {
            var p = null;
            while (p != 'Q' && p != 'R' && p != 'B' && p != 'N') {
                p = prompt("Promote to which piece? (Q, R, B, N)")
                if (p) { p = p[0].toUpperCase(); }
            }
        }
        curr_move = [f, t, p];
        client.move(f, t, p);
    }
    var chat = function(e) {
        e = e || window.event;
        var str = clean(INPUT.value," ',.");
        if (name && str && e.keyCode == ENTER_KEY) {
            post_chat(name, str);
            client.chat(str);
            INPUT.value = "";
        }
    }
    var move_piece = function(f, t, p) {
        clock.change();
        board.move(f, t, p);
    }
    var conf = function() {
        clock.change();
        board.move(curr_move[0], curr_move[1], curr_move[2]);
    }
    self.click_event = function(square_id) {
        board.click_event(square_id);
    }
    self.initialize = function() {
        document.onkeydown = chat;
        board.set_move_cb(move);
        board.reset(color)
        clock.set_timeout_cb(client.timeout);
        clock.set(300);
        client.set_cb('chat', post_chat);
        client.set_cb('confirm', conf);
        client.set_cb('move', move_piece);
        client.set_cb('time', clock.sync);
        client.set_cb('notice', notice);
        client.set_cb('list', list);
        client.set_cb('game', new_game);
        client.set_cb('gameover', gameover);
        client.connect('localhost', 7777);
    }
    self.new_seek = function() {
        if (! name) {
            name = clean(prompt("Enter name"),' ');
            if (! name) {
                return alert('invalid name');
            }
        }
        var initial = prompt("Select initial time (choices: 2, 5, 10, 20)");
        if (INITIAL_TIMES.indexOf(initial) == -1) {
            return alert('invalid initial time');
        }
        var increment = prompt("Select time increment (choices: 0, 2, 5, 12)");
        if (INCREMENT_TIMES.indexOf(increment) == -1) {
            return alert('invalid time increment');
        }
        client.seek(name, parseInt(initial)*60, increment);
    }
    self.draw = function() {
        client.draw();
    }
    self.forfeit = function() {
        client.forfeit();
    }
}

function play() {
    chess = new Chess();
    chess.initialize();
}

function quit() {
    chess.forfeit();
}
