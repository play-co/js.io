/*
 * GCRand
 *      A new Marsaglia's KISS -style PRNG
 *      - Period ~2^^96, enough to generate 2^^32 random numbers with a 32-bit seed
 *      - Passes all BigCrush tests
 *      - Performance is good
 *              It's 10% faster than a JavaScript Mersenne Twister I found for
 *              long output and much faster for short output
 *      - No multiply/divide/modulus instructions required
 *  - Completely avoids floating-point operations, so it should be fairly fast
 *    and portable across all platforms
 *  - For additional performance in inner loops use the cached version below
 *
 * Technical contact: Christopher A. Taylor <chris@gameclosure.com>
 */

// Define GCRand class
function GCRand(seed) {
        this.init(seed);
}

// Initialize the random number generator from an optional seed
GCRand.prototype.init = function(seed) {

        // If seed was not specified,
        if (typeof(seed) != 'number') {
                var mrx = Math.random() * 4294967296.0;
                var mry = new Date().getTime();
                seed = mrx ^ mry;
        }

        // XOR Shift
        x = seed ^ 1453667877;

        // Weyl Generator
        y = seed ^ 1223235218;

        // Add-With-Carry
        z = 2686646964 >>> 0;
        w = 3741327162 >>> 0;
        c = 0;
}

// Iterate state object returning the next 32-bit unsigned random value
GCRand.prototype.uint32 = function() {
        // XOR Shift
        var x = this.x;
        x ^= x << 5;
        x ^= x >>> 7;
        x ^= x << 22;
        this.x = x;

        // Weyl Generator
        var y = this.y;
        y += 2654435769;
        this.y = y >>> 0;

        // Add-With-Carry
        var w = this.w;
        var t = (this.z + w + this.c) >>> 0;
        this.z = w;
        this.c = t >>> 31;
        w = t & 2147483647;
        this.w = w;

        return (x + y + w) >>> 0;
}

// Produce a 31-bit integer number in the range [0 ... 0x7fffffff] inclusive
GCRand.prototype.uint31 = function() {
        return this.uint32() >>> 1;
}

// Produce a 32-bit floating-point number in the range [0.0 ... 1.0] inclusive
GCRand.prototype.random = function() {
        return this.uint32() * (1.0/4294967296.0);
}

// Produce a floating-point number in the range [a ... b] inclusive
GCRand.prototype.range_real = function(a, b) {
        return ( this.uint32() * (1.0/4294967296.0) ) * (b - a) + a;
}

// Produce an integer number in the range [a ... b] inclusive
GCRand.prototype.range_int = function(a, b) {
        return ( ( this.uint32() * (1.0/4294967296.0) ) * (b - a) + a + 0.5 ) >>> 0;
}

// Produce a 53-bit floating-point number according to a normal distribution
// with mean = 0 and variance = 1, using the Box-Mulder (trigonometric) method
GCRand.prototype.normal = function() {
        var u1 = 0,
                u2 = 0;

        while (u1 * u2 == 0.0) {
                u1 = this.random();
                u2 = this.random();
        }

        return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Produce a 53-bit floating-point number according to a Gaussian distribution
// with your specified mean and variance
GCRand.prototype.gaussian = function(mean, stddev) {
        return stddev * this.normal() + mean;
}

// Same as kiss96_gauss except it also clamps to a specified range
GCRand.prototype.gaussian_clamp = function(mean, stddev, clamp_lo, clamp_hi) {
        var x = stddev * this.normal() + mean;

        // Clamp to range
        if (x < clamp_lo) {
                x = clamp_lo;
        } else {
                if (x > clamp_hi) {
                        x = clamp_hi;
                }
        }

        return x;
}


/*
 * GCFastRand
 * Caches the random number generator output and loops over it for speed.
 *      - Provide a function to call to generate the numbers
 *      - Or accept the default of behaving like Math.random()
 *      - Invoke it like GCFastRand.random()
 */

function GCFastRand(prng_function, count) {

        if (!prng_function) {
                prng_function = Math.random;
        }

        if (typeof(count) != 'number') {
                count = 269; // A prime number to improve access randomness
        }

        this.count = count;
        this.index = 0;
        this.vector = [];
        for (var i = 0; i < count; ++i) {
                this.vector[i] = prng_function();
        }
}

GCFastRand.prototype.random = function() {
        var index = this.index++;
        if (index >= this.count) {
                index = 0;
                this.index = 1;
        }

        return this.vector[index];
}


// Exports
exports.Random = GCRand;
exports.FastRandom = GCFastRand;
