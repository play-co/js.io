exports = Class(function() {

	this.init = function(opts) {
    console.log(opts);
    this.x = opts.x;
    this.y = opts.y;
    if (opts.hasOwnProperty('convex')) this.convex = opts.convex;
  }
	
	/**
	 *
	 * Polygon representation : { 
	 *                                 x : [x1, x2, ... , xn], 
	 *                                 y : [y1, y2, ... , yn],
	 *                            convex : boolean
	 *                                                          } 
	 * 
	 **/
	var k, center;

	/*
	 * Check for convexity using Jarvis's march (aka giftwrapping)
	 */
	this.isConvex = function () {
		var x = this.x,
				y = this.y,
				length = x.length;
		// Polygon is non-degenerate
		if (length < 3) { return false; }
  
		var ax = x[0] - x[length-1],
				ay = y[0] - y[length-1],
				bx = x[1] - x[0],
				by = y[1] - y[0];
	
		var theta = Math.asin((by*ax-bx*ay) / (norm([ax,ay])*norm([bx,by]))),
				orientation = sign(theta);
	
		console.log('theta : ' + theta + ', orientation : ' + orientation);
  
		for (k = 1; k < length-1; k++) {
			ax = x[k]-x[k-1];
			ay = y[k]-y[k-1];
			bx = x[k+1]-x[k];
			by = y[k+1]-y[k];
			
			theta = Math.asin((by*ax-bx*ay) / (norm([ax,ay])*norm([bx,by])));
			
			console.log('theta : ' + theta + ', sign of turn : ' + sign(theta));
			
			if (theta != 0 && orientation + sign(theta) == 0) { 
				this.convex = false;
				return false;
			}
		}
		
		ax = x[length-1]-x[length-2];
		ay = y[length-1]-y[length-2];
		bx = x[0]-x[length-1];
		by = y[0]-y[length-1];
		theta = Math.asin((by*ax-bx*ay) / (norm([ax,ay])*norm([bx,by])));
		
		console.log('theta : ' + theta + ', sign of final turn : ' + sign(theta));
		
		if (theta != 0 && orientation + sign(theta) == 0) {
			this.convex = false;
			return false;
		}
		this.convex = true;
		return true;
	};

	
	this.getCenter = function() {
		var x = this.x,
				y = this.y;
		center = [array_sum(x) / x.length, array_sum(y) / y.length];
		return center;
	}

	this.containsPoint = function (point) {
		var x = point[0],
				y = point[1],
				j = 0, 
				polyx = this.x, polyy = this.y,
				x1, x2, y1, y2,
				v1x, v1y, v2x, v2y,
				theta=0,
				l = this.x.length;
		
		for (var i = 0; i < l; i++) {
			j = (i === l - 1) ? 0 : i + 1;
			x1 = polyx[i];
			y1 = polyy[i];
			x2 = polyx[j];
			y2 = polyy[j];
			
			v1x = x1-x;
			v1y = y1-y;
			v2x = x2-x;
			v2y = y2-y;
			
			theta += Math.asin((v1x*v2y - v1y*v2x) / (norm([v1x,v1y]) * norm([v2x,v2y])));
		}
		theta = Math.abs(theta);
		return approx(theta, 2*Math.PI, 1e-6); 
	};
	
	/* 
	 * Scale the polygon about the 'center of mass'
	 * @scalar : the scaling factor
	 */
	this.scale = function (scalar) {
		var x = this.x,
				y = this.y;
		center = [array_sum(x) / x.length, array_sum(y) / y.length];
		
		for (k = 0; k < x.length; k++) {
			x[k] = center[0] + (x[k]-center[0])*scalar;
			y[k] = center[1] + (y[k]-center[1])*scalar;
		}
	};

	/* 
	 * Translate the polygon along the given vector
	 * @displacement : vector specifying translation
	 */
	this.translate = function (displacement) {
		for (k = 0; k < this.x.length; k++){
			this.x[k] += displacement[0], this.y[k] += displacement[1];
		}
	};
	
	/* 
	 * Rotate the polygon about the center*
	 * @theta : angle which to rotate counterclockwise
	 */
	this.rotate = function (theta) {
		var x = this.x,
				y = this.y;
	
		center = [array_sum(x) / x.length, array_sum(y) / y.length];
		
		console.log('__________________' + array_sum(x));

		var cos = Math.cos(theta),
				sin = Math.sin(theta);
		
		for (k = 0; k < x.length; k++){
			var offset = [ x[k] - center[0], y[k]-center[1] ];
			this.x[k] = cos * offset[0] - sin * offset[1];
			this.y[k] = sin * offset[0] - cos * offset[1];
		}
	};

	/*
	 * Find the smallest element in an array, wrt compare (avoids sorting)
	 * @compare : return -1 || 0 || 1
	 */
	function smallest (arr, compare) {
		if (arr.length < 1) { return undefined; }
		var min = arr[0];
		for (k = 1; k<arr.length; k++){
			if (compare(arr[k],min) == -1) min = arr[k];
		}
		return min;
	}

	/*
	 * Sum an array of numbers
	 */
	function array_sum (arr) {
		var ans = 0;
		for (k = 0; k < arr.length; k++) {
			ans += arr[k];
		}
		return ans;
	}

	function len (vec) {
		return Math.pow (vec[0]*vec[0] + vec[1]*vec[1], 0.5);
	}

	function normalize (v) {
		var len = len(v);
		return [ v[0] / len, v[1] / len ];
	}

	function vec_len (v) {
		return Math.pow(v[0]*v[0] + v[1]*v[1], 0.5)
	}
	
	function sign (n) {
		if (n<0) {
			return -1;
		}
		else if (n>0) {
			return 1;
		}
		else return 0;
	}
	
	function approx(a,b,epsilon) {
		return (Math.abs(a-b)<epsilon);
	}
	
	function norm (v) {
		return Math.pow(v[0]*v[0] + v[1]*v[1], 0.5);
	}
});
