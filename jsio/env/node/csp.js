require('.csp.')

for (key in csp) {
    exports[key] = csp[key];
}
