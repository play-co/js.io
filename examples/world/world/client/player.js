require('jsio', ['Class', 'bind']);
require('jsio.interfaces', 'PubSub');
require('..constants', '*');

exports.WorldPlayer = Class(PubSub, function() {
	this.init = function(params) {
		if(!params) { params = {}; }
		this.historyEl = params.history;
		this.username = params.username || '';
		this.color = params.color || {
			r: Math.floor(Math.random() * 128) + 128,
			g: Math.floor(Math.random() * 128) + 128,
			b: Math.floor(Math.random() * 128) + 128
		};
		
		this._x = this.x = params.x || Math.floor(Math.random() * (kGameWidth - 20)) + 10;
        this._y = this.y = params.y || Math.floor(Math.random() * (kGameHeight - 20)) + 10;
		
		this.dir = 'down';
		
		this.el = $.create({
			className: 'player', 
			style: {
				width: kPlayerSize + 'px',
				height: kPlayerSize + 'px'
			},
			parent: params.parent
		});
		
		this.text = $.create({
			className: 'msg',
			parent: params.parent,
			text: params.msg || '',
			style: {
				color: 'rgb(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ')'
			}
		});
		
		this.name = $.create({
			className: 'name',
			parent: params.parent,
			text: this.username.substring(0, 14)
		});
	}
	
	this.say = function(text, ts) {
		if(!text) { text = ''; }

		if(text.length > 140) {
			text = text.substring(0, 140) + '\u2026';
		}
		$.setText(this.text, text);
	}
	
	this.move = function(x, y) {
		if(x < kBounds.minX) x = kBounds.minX;
		if(x > kBounds.maxX) x = kBounds.maxX;
		if(y < kBounds.minY) y = kBounds.minY;
		if(y > kBounds.maxY) y = kBounds.maxY;
		
		this.x = x;
		this.y = y;
		
		if(this._y === null) {
			this._x = x;
			this._y = y;
		}
		
		this.update();
	}
	
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

		$.style(this.el, {
			top: this._y + 'px',
			left: this._x + 'px',
			backgroundPosition: kSprite[this.dir][0] + 'px ' + kSprite[this.dir][1] + 'px'
		});
		
		$.style(this.text, {
			top: this._y - 15 + 'px',
			left: this._x + 25 + 'px'
		});
		
		$.style(this.name, {
			top: this._y + 20 + 'px',
			left: this._x + 'px'
		});
		
		return this._x != this.x || this._y != this.y;
	}
	
	this.destroy = function() {
		$.remove(this.el);
		$.remove(this.name);
		$.remove(this.text);
	}
});
