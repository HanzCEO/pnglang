const { COMMANDS, ARG_TYPE } = require('./enums');

module.exports = class Environment {
	constructor() {
		this.register = {
			rax: 0,
			rbx: 0,
			rcx: 0,
			rdx: 0
		};
	}

	decodeArgValue(type, val) {
		switch (type) {
		case ARG_TYPE['STRING']:
			return String.fromCharCode(val);
		case ARG_TYPE['INT']:
			return String.fromCharCode(val);
			// return String(val)[0];
		}
	}

	parseFunctionCall(code, i) {
		let detail = {};

		// Parse function id and args types
		detail.command = code[i][0];
		detail.argsType = [code[i][1], code[i][2]];
		i++;

		// Parse args length
		detail.argsLength = [0, 0];
		while (code[i][0] != COMMANDS['ARGPART']) {
			detail.argsLength[0] += code[i][1];
			detail.argsLength[1] += code[i][2];
			i++;
		}

		// Parse args content
		detail.argsValue = ['', ''];
		while (code[i][0] == COMMANDS['ARGPART']) {
			detail.argsValue[0] += decodeArgValue(detail.argsType[0], code[i][1]);
			detail.argsValue[1] += decodeArgValue(detail.argsType[1], code[i][2]);
			i++;
		}

		return {
			i,
			detail
		};
	}

	run(code) {
		for (let i = 0; i < code.length; i++) {
			const instruction = code[i];
			if (instruction[0] > 12) {
				let evaluation = parseFunctionCall(code, i);
				i = evaluation.i;
				let detail = evaluation.detail;

				switch (detail.command) {
				case COMMANDS.ADD:
					console.log(
						(detail.argsValue[0] - '0')
						+
						(detail.argsValue[1] - '0')
					);
					break;
				case COMMANDS.LOG:
					console.log(detail.argsValue[0]);
					break;
				}
			}
		}
	}
};
