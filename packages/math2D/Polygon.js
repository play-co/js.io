let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Polygon from 'math/geom/Polygon';
exports = Polygon;
logger.log('Warning: math2D.Polygon is deprecated');

export default exports;
