import .Point;
import .Line;
import .Rect;

/**
 * @package math.geom.intersect
 */
var intersect = exports;

intersect.pointAndRect = intersect.ptAndRect = function (pt, rect) {
	var x = pt.x,
			y = pt.y;
	return (x >= rect.x &&
					x <= rect.x + rect.width &&
					y >= rect.y &&
					y <= rect.y + rect.height);
};

intersect.rectAndPoint = intersect.rectAndPt = function (rect, pt) {
	return intersect.pointAndRect(pt, rect);
};

intersect.pointAndCircle = intersect.ptAndCirc = function(pt, circ) {
	var dx = pt.x - circ.x,
			dy = pt.y - circ.y;
	return dx * dx + dy * dy < circ.radius * circ.radius;
};

intersect.circleAndPoint = intersect.circAndPt = function (circ, pt) {
	return intersect.pointAndCircle(pt, circ);
};

intersect.rectAndRect = function (rect1, rect2) {
	return !((rect1.y + rect1.height < rect2.y) ||
					 (rect2.y + rect2.height < rect1.y) ||
					 (rect1.x + rect1.width < rect2.x) ||
					 (rect2.x + rect2.width < rect1.x));
};

var SIDE = Rect.SIDE;

intersect.circleAndRect = function(circle, rect) {
	if (intersect.pointAndRect(circle, rect)) {
		return true;
	}
	return (intersect.lineAndCircle(rect.getSide(1), circle) ||
					intersect.lineAndCircle(rect.getSide(2), circle) ||
					intersect.lineAndCircle(rect.getSide(3), circle) ||
					intersect.lineAndCircle(rect.getSide(4), circle));
};

intersect.rectAndCircle = function(rect, circle) {
	return intersect.circleAndRect(circle, rect);
};

intersect.lineAndCircle = function (line, circle) {
	var vec = intersect.pointToLine(circle, line);
	return vec.getMagnitude() < circle.radius;
};

intersect.circleAndLine = function (circle, line) {
	return intersect.lineAndCircle(line, circle);
};

// Return the minimum displacement vector in case of collision
intersect.polyAndPoly = function(poly1, poly2) {
  var x1 = poly1.x, 
      y1 = poly1.y,
      x2 = poly2.x,
      y2 = poly2.y,
      i = 0, l = x1.length,
      j, k = x2.length,
      normal = [0,0],
      length,
      min1, min2, max1, max2,
      MTV, MTV2 = null,
      MN = null,
      dot,
      nextX, nexyY,
      currentX, currentY, 
      m;
  // loop through the edges of polygon 1
  for (; i < l; i++) {
    var m = (i == l-1 ? 0 : i+1);
    currentX = x1[i];
    currentY = y1[i];
    nextX = x1[m];
    nextY = y1[m];
    
    //generate the normal for current edge
    normal = [currentY - nextY, nextX - currentX];
    length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1])
    normal[0] /= length;
    normal[1] /= length;
    min1 = min2 = max1 = max2 = -1;
    //project vertices from poly1 onto axis
    for (j=0; j<l; j++) {
      dot = x1[j]*normal[0] + y1[j] * normal[1];
      if (dot > max1 || max1 === -1) max1 = dot;
      if (dot < min1 || min1 === -1) min1 = dot;      
    }
    // project all vertices from poly2 onto axis
    for (j=0; j<k; j++) {
      dot = x2[j]*normal[0] + y2[j]*normal[1];
      if (dot>max2 || max2 == -1) max2 = dot;
      if (dot<min2 || min2 == -1) min2 = dot;
    }
    // calculate the minimum translation vector should be negative
    if(min1<min2) {
      interval = min2-max1; 
      normal[0] = -normal[0];
      normal[1] = -normal[1];
    } else {
      interval = min1-max2;
    }
    // exit early if positive
    if (interval >=0) {
      return false;
    }
    if (MTV === null || interval > MTV) {
      MTV = interval;
      MN = normal;
    }
  }
  // loop throught the edges of polygon 2
  for (i=0; i<k; i++) {
    m = (i==k-1 ? 0 : i+1);
    currentX = x2[i], currentY = y2[i],
    nextX = x2[m], nextY = y2[m];
    // generate the normal
    normal = [currentY - nextY, nextX - currentX];
    length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1])
    normal[0] /= length;
    normal[1] /= length;
    min1 = min2 = max1 = max2 = -1;
    //project all vertices from poly1 onto axis
    for (j=0; j<l; j++) {
      dot = x1[j]*normal[0] + y1[j]*normal[1];
      if (dot > max1 || max1 === -1) max1 = dot;
      if (dot < min1 || min1 === -1) min1 = dot;
    }
    //project all vertices from poly2 onto axis
    for (j=0; j<k; j++) {
      dot = x2[j]*normal[0] + y2[j]*normal[1];
      if (dot > max2 || max2 === -1) max2 = dot;
      if (dot < min2 || min2 === -1) min2 = dot;
    }
    //calculate the minimum translation vector should be negative
    if(min1 < min2) {
      interval = min2-max1;
      normal[0] *= -1;
      normal[1] *= -1;
    } else {
      interval = min1-max2;
    }
    //exit early if positive
    if (interval >= 0) {
      return false;
    }
    if (MTV === null || interval > MTV) MTV = interval;
    if (interval > MTV2 || MTV2 === null) {
      MTV2 = interval;
      MN = normal;
    }
  }

  return {overlap: MTV2, normal: MN};
};


// returns line from pt to nearest pt on line
intersect.pointToLine = intersect.ptToLine = function (pt, line) {
	var dx = (line.end.x - line.start.x),
			dy = (line.end.y - line.start.y),
			u = ((pt.x - line.start.x) * dx	// TODO can we abstract this from 2D to 2D/3D?
					 + (pt.y - line.start.y) * dy) / (dx * dx + dy * dy);

	var i;
	if (u < 0) {
		i = new Point(line.start);
	} else if (u > 1) {
		i = new Point(line.end);
	} else {
		i = new Point(line.start.x + u * dx, line.start.y + u * dy);
	}
	return new Line(i, pt);
};

// returns rectangle of intersection
intersect.rectAndRect = function(rect1, rect2) {
	if (rect1 === true) { return new Rect(rect2); }
	if (rect2 === true) { return new Rect(rect2); }
	
	if (intersect.rectAndRect(rect1, rect2)) {
		var x1 = Math.max(rect1.x, rect2.x),
				y1 = Math.max(rect1.y, rect2.y),
				x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width),
				y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
		return new Rect(x1, y1, x2 - x1, y2 - y1);
	}
	return null;
};
