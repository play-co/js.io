// TODO: Support left vs right vs both padding?
exports = function (input, length, padString) {
	input = String(input);
	padString = padString || " ";
	while (input.length < length) {
		input = padString + input;
	}
	return input;
};
