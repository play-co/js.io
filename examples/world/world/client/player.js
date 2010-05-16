jsio('import lib.PubSub as PubSub');
jsio('from ..constants import *');
jsio('from util.browser import $');

exports.WorldPlayer = Class(PubSub, function() {
	this.init = function(params) {
		if(!params) { params = {}; }
		this.historyEl = params.history;
		this.username = params.username || '';
		this.color = params.color;
		
		this.text = params.msg || '';
		this._x = this.x = params.x;
		this._y = this.y = params.y;
		
		this.dir = 'down';
		
		var parent = params.parent;
		setTimeout(bind(this, function() {
			this.el = $.create({
				className: 'player', 
				style: {
					width: kPlayerSize + 'px',
					height: kPlayerSize + 'px'
				},
				parent: parent
			});

			this.textEl = $.create({
				className: 'msg',
				parent: parent,
				text: this.text || '',
				style: {
					color: 'rgb(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ')'
				}
			});

			this.nameEl = $.create({
				className: 'name',
				parent: parent,
				text: this.username.substring(0, 14)
			});
			
			this.update();
		}), 0);
	}
	
	this.say = function(text, ts) {
		if(!text) { text = ''; }

		if(text.length > 140) {
			text = text.substring(0, 140) + '\u2026';
		}
		
		this.text = text;
		if(this.textEl) {
			$.setText(this.textEl, text);
		}
	}
	
	this.move = function(x, y) {
		this.x = x;
		this.y = y;
		
		if(this._y === null) {
			this._x = x;
			this._y = y;
		}
		
		this.update();
	}
	
	this.isMoving = function() { return this._isMoving; }
	
	this.update = function() {
		if(this._x != this.x || this._y != this.y) {
			var dx = this.x - this._x;
			var dy = this.y - this._y;
			var adx = Math.abs(dx);
			var ady = Math.abs(dy);
			if(adx > ady) {
				this.dir = dx > 0 ? 'right' : 'left';
			} else {
				this.dir = dy >= 0 ? 'down' : 'up'; 
			}
						
			if(dx * dx + dy * dy < 1) {
				this._x = this.x;
				this._y = this.y;
			} else if(adx > ady) {
				this._x += this._x < this.x ? 1 : -1;
				this._y += this._y < this.y ? ady / adx : -ady / adx;
			} else {
				this._y += this._y < this.y ? 1 : -1;
				this._x += this._x < this.x ? adx / ady : -adx / ady;
			}
		}

		if(this.el) {
			$.style(this.el, {
				top: this._y + 'px',
				left: this._x + 'px',
				backgroundPosition: kSprite[this.dir][0] + 'px ' + kSprite[this.dir][1] + 'px'
			});
		
			$.style(this.textEl, {
				top: this._y - 15 + 'px',
				left: this._x + 25 + 'px'
			});
		
			$.style(this.nameEl, {
				top: this._y + 20 + 'px',
				left: this._x + 'px'
			});
		}
		
		return (this._isMoving = this._x != this.x || this._y != this.y);
	}
	
	this.destroy = function() {
		$.remove(this.el);
		$.remove(this.nameEl);
		$.remove(this.textEl);
	}
});
