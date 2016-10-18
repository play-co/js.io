let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import angle from 'math/geom/angle';
exports = angle;
logger.log('Warning: math2D.angle is deprecated');

export default exports;
