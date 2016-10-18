let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Vec2D from 'math/geom/Vec2D';
exports = Vec2D;
logger.log('Warning: math2D.Vec2D is deprecated');

export default exports;
