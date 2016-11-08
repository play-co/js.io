let exports = {};

import Enum from 'lib/Enum';
import Point from './Point';
import Line from './Line';
import intersect from './intersect';

/**
 * Model a rectangle.
 */
exports = class Rect {
  constructor (a, b, c, d) {
    switch (arguments.length) {
      case 0:
      // init
        this.width = this.height = this.x = this.y = 0;
        break;
      case 1:
      // copy
        this.width = a.width;
        this.height = a.height;
        this.x = a.x;
        this.y = a.y;
        break;
      case 2:
      // (x, y), (width, height)
        this.x = a.x;
        this.y = a.y;
        this.width = b.x;
        this.height = b.y;
        break;
      case 3:
      // (x, y), width, height
        this.x = a.x;
        this.y = a.y;
        this.width = b;
        this.height = c;
        break;
      case 4:
      // x, y, width, height
        this.x = a;
        this.y = b;
        this.width = c;
        this.height = d;
        break;
    }
  }

  normalize () {
    if (this.width < 0) {
      this.x -= this.width;
      this.width = -this.width;
    }

    if (this.height < 0) {
      this.y -= this.height;
      this.height = -this.height;
    }
    return this;
  }

  intersectRect (rect) {
    if (intersect.isRectAndRect(this, rect)) {
      var x1 = this.x;
      var y1 = this.y;
      var x2 = this.x + this.width;
      var y2 = this.y + this.height;

      this.x = Math.max(x1, rect.x), this.y = Math.max(y1, rect.y), this.width =
        Math.min(x2, rect.x + rect.width) - this.x;
      this.height = Math.min(y2, rect.y + rect.height) - this.y;
    } else {
      this.width = 0;
      this.height = 0;
    }
  }

  unionRect (rect) {
    this.normalize();
    if (rect.normalize) {
      rect.normalize();
    }

    var x2 = this.x + this.width,
      y2 = this.y + this.height;

    var rx2 = rect.x + rect.width,
      ry2 = rect.y + rect.height;

    this.x = this.x < rect.x ? this.x : rect.x;
    this.y = this.y < rect.y ? this.y : rect.y;

    this.width = (x2 > rx2 ? x2 : rx2) - this.x;
    this.height = (y2 > ry2 ? y2 : ry2) - this.y;
  }
  getCorner (i) {
    switch (i) {
      case CORNERS.TOP_LEFT:
        return new Point(this.x, this.y);
      case CORNERS.TOP_RIGHT:
        return new Point(this.x + this.width, this.y);
      case CORNERS.BOTTOM_LEFT:
        return new Point(this.x, this.y + this.height);
      case CORNERS.BOTTOM_RIGHT:
        return new Point(this.x + this.width, this.y + this.height);
    }
  }

  getSide (i) {
    switch (i) {
      case SIDES.TOP:
        return new Line(this.getCorner(CORNERS.TOP_LEFT), this.getCorner(
        CORNERS.TOP_RIGHT));
      case SIDES.RIGHT:
        return new Line(this.getCorner(CORNERS.TOP_RIGHT), this.getCorner(
        CORNERS.BOTTOM_RIGHT));
      case SIDES.BOTTOM:
        return new Line(this.getCorner(CORNERS.BOTTOM_RIGHT), this.getCorner(
        CORNERS.BOTTOM_LEFT));
      case SIDES.LEFT:
        return new Line(this.getCorner(CORNERS.BOTTOM_LEFT), this.getCorner(
        CORNERS.TOP_LEFT));
    }
  }

  getCenter () {
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }
};
var Rect = exports;

var SIDES = Rect.SIDES = Enum('TOP', 'BOTTOM', 'LEFT', 'RIGHT');
var CORNERS = Rect.CORNERS = Enum('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_RIGHT',
  'BOTTOM_LEFT');

export default exports;
