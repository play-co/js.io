let exports = {};

/*
* @shim
*/
import { logger } from 'base';

import Rect from 'math/geom/Rect';
exports = Rect;
logger.log('Warning: math2D.Rect is deprecated');

export default exports;
