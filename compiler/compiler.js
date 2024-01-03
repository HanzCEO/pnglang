const Jimp = require('jimp');

const { COMMANDS_NAME, COMMANDS, ARG_TYPE, REGISTERS_NAME } = require('./enums');

/* Encoders */
function encodeArgumentLength(arg1, arg2) {
	let code = [];

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

	return code;
}

function encodeArgumentValues(arg1, arg2) {
	let code = [];

	let arg1val = arg1.value.toString().split('').map(ch => ch.charCodeAt(0));
	let arg2val = arg2.value.toString().split('').map(ch => ch.charCodeAt(0));

	let argmaxval = Math.max(arg1val.length, arg2val.length);
	for (let i = 0; i < argmaxval; i++) {
		code.push([COMMANDS['ARGPART'], arg1val[i] ?? 0, arg2val[i] ?? 0]);
	}

	return code;
}

/* Interpreter stuff */

/* Parser */
function parseString(arg) {
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

	return val;
}

/* Another stuff */

function processArgument(arg) {
	if (arg === '\x00') {
		// void
		return { type: ARG_TYPE.VOID, value: '' };
	} else if (arg.startsWith('"')) {
		// String
		let val = parseString(arg);

		return {
			type: ARG_TYPE.STRING,
			value: val
		};
	} else if ('0' <= arg[0] && arg[0] <= '9') {
		return {
			type: ARG_TYPE.INT,
			value: arg
		};
	} else if (REGISTERS_NAME.includes(arg)) {
		return {
			type: ARG_TYPE.REGISTER,
			value: arg
		};
	} else if (arg.startsWith('@')) {
		return {
			type: ARG_TYPE.ADDRESSER,
			value: arg.substr(1)
		};
	}
}

function parseArguments(_args) {
	let args = _args.split(' ');

	// Search for end of strings
	if (args.length > 2) {
		if (args[0].startsWith('"')) {
			// It's a string!
			// Now search for end of '"'
			let o = 0;
			for (o = 0; o < args.length; o++) {
				if (args[o].endsWith('"')) break;
			}
			o++; // for Array.slice()

			args = [args.slice(0, o).join(' '), ...args.slice(o)];
			// TODO: Add string support for 2nd argument
		}
	}

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
	let lineIndex = 0;
	for (let line of lines) {
		line = line.trim();
		lineIndex++;

		// if comment
		if (line.startsWith(';')) {
			continue;
		}

		// if blank line
		if (line.length == 0) {
			continue;
		}
		
		let [command] = line.split(' ', 1);
		let args = line.substr(command.length + 1);

		let [arg1, arg2] = parseArguments(args);

		retval.push({lineIndex, instruction: [command, arg1, arg2]});
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

	let instructionInserted = 0;
	for (let {lineIndex, instruction} of codeset) {
		let [command, arg1, arg2] = instruction;
		let args = [arg1, arg2].map(voidOrValue);
		// TODO: valCodes is unused
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
			case ARG_TYPE.ADDRESSER:
				// unused lines of code
				let uloc = lineIndex-1 - instructionInserted;

				// instruction position in file (1-index)
				let instPos = Number(arg.value) - uloc;
				// +1 to include our jmp instruction
				let instDelta = instructionInserted - instPos + 1;

				// instruction position in code array (0-index)
				let codePos = 0;
				if (instructionInserted < instPos) {
					// We need to go back to the future later
					arg.value = String(-(instPos - instructionInserted - 1));
				} else {
					for (let ii = code.length-1; ii >= 0; ii--) {
						if (code[ii][0] == COMMANDS['CM&']) {
							if (code[ii][1] + code[ii][2] == 0) {
								instDelta--;
								if (instDelta <= 0) {
									codePos = ii;
									break;
								}
							}
						}
					}
					arg.value = String(codePos);
				}
				// Fall down to integer encoder
			case ARG_TYPE.INT:
				let hex = Number(arg.value).toString(16);
				for (let p = 0; p < hex.length; p += 2) {
					valCodes[i].push(
						parseInt(hex.substr(p, 2), 16)
					);
				}
				break;
			case ARG_TYPE.REGISTER:
				let index = REGISTERS_NAME.indexOf(arg.value);
				valCodes[i] = [index];
				break;
			}
		}

		// [CM&, \x00, \x00]
		code.push([COMMANDS['CM&'], 0, 0]);
		instructionInserted++;

		// 1) [COMMAND, ARG1_TYPE, ARG2_TYPE]
		code.push([COMMANDS_NAME.indexOf(command), arg1.type, arg2.type]);

		/*
		 * 2) [IS_LENGTH_END_DEFINITION, ARG1_LENGTH, ARG2_LENGTH]
		 * ... // until IS_LENGTH_END_DEFINITION byte is not 0
		 */
		let lengthcodes = encodeArgumentLength(arg1, arg2);
		for (const c of lengthcodes) {
			code.push(c);
		}

		/*
		 * 3) [__RESERVED__, ARG1_PART, ARG2_PART]
		 * ... // until it finishes
		 */
		let argvalCodes = encodeArgumentValues(arg1, arg2);
		for (const c of argvalCodes) {
			code.push(c);
		}

		// [CM&, \x01, \x01]
		code.push([COMMANDS['CM&'], 1, 1]);
	}

	code = solveAllAddresser(code);

	return code;
}

function solveAllAddresser(codes) {
	let commandStart = false;
	for (let i = 0; i < codes.length; i++) {
		let code = codes[i];
		if (commandStart) {
			let isAddresser = false;
			let [command, ...argtypes] = code;
			let argval = [{value: ''}, {value: ''}];
			let argsLength = []; // in codes

			for (let ii = 0; ii < argtypes.length; ii++) {
				if (argtypes[ii] == ARG_TYPE.ADDRESSER) {
					isAddresser = true;
					let u = i + 2; // index for reading `addressed` bytes
					let addressed = ''; // the address
					let final = 0; // final form of address
					// console.log(codes.slice(u));
					while (codes[u][0] == 2) {
						addressed += String.fromCharCode(codes[u][ii+1]);
						u++;
					}
					addressed = Number(addressed);
					if (addressed < 0) {
						// Future looking
						for (let p = i; p < codes.length; p++) {
							if (codes[p][0] == COMMANDS['CM&']) {
								if (codes[p][1] + codes[p][2] == 0) {
									addressed++;
									// console.log(addressed, p);
									if (addressed >= 0) {
										final = p;
										break;
									}
								}
							}
						}
						// console.log("SOLVE ALL", final, i);
						// console.table(codes.slice(final))
						// It is time to put our updated value here
						// TODO: Change value to empty array if valCodes implemented
						argval[ii] = { value: String(final) };
						// implement valCodes first
						/*let hex = Number(final).toString(16);
						for (let p = 0; p < hex.length; p += 2) {
							argval[ii].value.push(
								parseInt(hex.substr(p, 2), 16)
							);
						}*/
					} else {
						// Don't solve this solved addresser
						isAddresser = false;
					}
				}
			}

			// Begin replacing current values
			if (isAddresser) {
				argsLength = encodeArgumentLength(...argval);
				argsValue = encodeArgumentValues(...argval);

				i++; // Step once to arguments length assembly
				// Alter argument length assembly
				let needsToBeDeleted = 0;
				while (codes[i + needsToBeDeleted][0] != 2) needsToBeDeleted++;
				codes.splice(i, needsToBeDeleted, ...argsLength);
				i += argsLength.length; // Step to arguments values

				// Now we need to alter arguments values assembly
				needsToBeDeleted = 0;
				while (codes[i + needsToBeDeleted][0] == 2) needsToBeDeleted++;
				codes.splice(i, needsToBeDeleted, ...argsValue);
				i += argsValue.length;
			}

			commandStart = false;
		}

		if (code[0] == COMMANDS['CM&']) {
			if (code[1] + code[2] == 0) {
				// Command start
				commandStart = true;
			}
		}
	}

	return codes;
}

module.exports = {
	asmToCode
};
