const Jimp = require('jimp');

const { COMMANDS_NAME } = require('./enums');
const Environment = require('./environment');

function parseArguments(_args) {
	let args = _args.split(' ');

	for (let i = 0; i < args.length; i++) {
		if (args[i].length == 0) args[i] = '\x00';
	}

	if (args.length < 2) {
		args = args.concat('\x00'.repeat(2 - args.length).split(''));
	}

	return args;
}

function parse(asm) {
	/*
	 * All are string
	 * | string(3) | string() | string() |
	 *   ^ Command   ^ arg1     ^ arg2
	 */

	let retval = [];
	let lines = asm.split('\n');
	lines.pop();
	for (let line of lines) {
		line = line.trim();
		let [command] = line.split(' ', 1);
		let args = line.substr(command.length + 1);

		let [arg1, arg2] = parseArguments(args);
		retval.push([command, arg1, arg2]);
	}

	return retval;
}

function asmToCode(asm) {
	let codeset = parse(asm);
	let code = [];

	for (const [command, arg1, arg2] of codeset) {
		code.push([COMMANDS_NAME.indexOf(command), arg1.charCodeAt(0), arg2.charCodeAt(0)]);
	}

	return code;
}

function interpretFile(filename) {
	Jimp.read(filename, (err, input) => {
		if (err) throw err;

		let code = [];
		let i = 0;
		let finished = false;
		for (let x = 0; x < input.bitmap.width; x++) {
			if (finished) break;
			for (let y = 0; y < input.bitmap.height; y++) {
				let color = Jimp.intToRGBA(input.getPixelColor(x, y));

				if (code[Math.floor(i / 3)] === undefined) {
					code[Math.floor(i / 3)] = [0, 0, 0];
				}

				code[Math.floor(i / 3)][i % 3] = color.a;
				if (code[Math.floor(i / 3)][0] == 0) {
					// EOF
					finished = true;
					break;
				}

				i++;
			}
		}

		let env = new Environment();
		env.run(code);
	});
}

module.exports = {
	asmToCode,
	interpretFile
};
