let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Circle from 'math/geom/Circle';
exports = Circle;
logger.log('Warning: math2D.Circle is deprecated');

export default exports;
