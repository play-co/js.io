let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Line from 'math/geom/Line';
exports = Line;
logger.log('Warning: math2D.Line is deprecated');

export default exports;
