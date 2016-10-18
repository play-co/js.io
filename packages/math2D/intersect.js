let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import intersect from 'math/geom/intersect';
exports = intersect;
logger.log('Warning: math2D.intersect is deprecated');

export default exports;
