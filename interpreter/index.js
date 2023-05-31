const Jimp = require('jimp');

const { COMMANDS_NAME, COMMANDS, ARG_TYPE } = require('./enums');
const Environment = require('./environment');

function processArgument(arg) {
	if (arg === '\x00') {
		// void
		return { type: ARG_TYPE.VOID, value: '' };
	} else if (arg.startsWith('"')) {
		// String
		let val = '';
		let escaped = false;

		// Remove the prefix '"'
		for (const ch of arg.substr(1)) {
			if (ch == '\\') {
				escaped = true;
				continue;
			} else if (ch == '"' && !escaped) {
				break;
			}

			val += ch;
		}

		return {
			type: ARG_TYPE.STRING,
			value: val
		};
	} else if ('0' <= arg[0] && arg[0] <= '9') {
		return {
			type: ARG_TYPE.INT,
			value: arg
		};
	}
}

function parseArguments(_args) {
	let args = _args.split(' ');

	for (let i = 0; i < args.length; i++) {
		if (args[i].length == 0) args[i] = '\x00';
	}

	if (args.length < 2) {
		args = args.concat('\x00'.repeat(2 - args.length).split(''));
	}

	args = args.map(processArgument);

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

	/* @v1
	 * 0) [CM&, \x00, \x00]
	 * 1) [COMMAND, ARG1_TYPE, ARG2_TYPE]
	 * 2) [IS_LENGTH_END_DEFINITION, ARG1_LENGTH, ARG2_LENGTH]
	 * ... // until IS_LENGTH_END_DEFINITION byte is not 0
	 * 3) [__RESERVED__, ARG1_PART, ARG2_PART]
	 * ... // until it finishes
	 * 4) [CM&, \x01, \x01]
	 */

	const voidOrValue = x => {
		if (x === undefined) {
			return { type: ARG_TYPE.VOID, value: '' };
		} else {
			return x;
		}
	};

	for (let [command, arg1, arg2] of codeset) {
		let args = [arg1, arg2].map(voidOrValue);
		let valCodes = [[], []];

		// Reapply
		[arg1, arg2] = args;

		for (let i = 0; i < args.length; i++) {
			let arg = args[i];

			switch (arg.type) {
			case ARG_TYPE.VOID:
				valCodes[i] = [0];
				break;
			case ARG_TYPE.STRING:
				valCodes[i] = arg.value.split('').map(ch => ch.charCodeAt(0));
				break;
			case ARG_TYPE.INT:
				let hex = Number(arg.value).toString(16);
				for (let p = 0; p < hex.length; p += 2) {
					valCodes[i].push(
						parseInt(hex.substr(p, 2), 16)
					);
				}
				break;
			}
		}

		// [CM&, \x00, \x00]
		code.push([COMMANDS['CM&'], 0, 0]);

		// 1) [COMMAND, ARG1_TYPE, ARG2_TYPE]
		code.push([COMMANDS_NAME.indexOf(command), arg1.type, arg2.type]);

		/*
		 * 2) [IS_LENGTH_END_DEFINITION, ARG1_LENGTH, ARG2_LENGTH]
		 * ... // until IS_LENGTH_END_DEFINITION byte is not 0
		 */
		let lengths = [arg1.value.length, arg2.value.length];
		let lengthMax = Math.max(arg1.value.length, arg2.value.length);
		// Remember: 255 is 255 not 256 as in 0-index
		for (let i = 0; i < Math.floor(lengthMax / 255); i++) {
			lengths[0] -= 255;
			lengths[1] -= 255;

			let l1 = lengths[0] < 0 ? 0 : 255;
			let l2 = lengths[1] < 0 ? 0 : 255;
			code.push([0, l1, l2]);
		}
		code.push([1, Math.max(0, lengths[0]), Math.max(0, lengths[1])]);

		/*
		 * 3) [__RESERVED__, ARG1_PART, ARG2_PART]
		 * ... // until it finishes
		 */
		let arg1val = arg1.value.toString().split('').map(ch => ch.charCodeAt(0));
		let arg2val = arg2.value.toString().split('').map(ch => ch.charCodeAt(0));

		let argmaxval = Math.max(arg1val.length, arg2val.length);
		for (let i = 0; i < argmaxval; i++) {
			code.push([COMMANDS['ARGPART'], arg1val[i] ?? 0, arg2val[i] ?? 0]);
		}

		// [CM&, \x01, \x01]
		code.push([COMMANDS['CM&'], 1, 1]);
	}

	return code;
}

async function interpretFile(filename) {
	return new Promise((resolve, reject) => {
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
					if (code[Math.floor(i / 3)]
						.filter(x => x === 0)
						.length == 3
					) {
						// EOF [0,0,0]
						finished = true;
						break;
					}

					i++;
				}
			}

			let env = new Environment();
			env.run(code);
			resolve(env);
		});
	});
}

module.exports = {
	asmToCode,
	interpretFile
};
