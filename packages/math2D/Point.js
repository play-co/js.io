let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Point from 'math/geom/Point';
exports = Point;
logger.log('Warning: math2D.Point is deprecated');

export default exports;
