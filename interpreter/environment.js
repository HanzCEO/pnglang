const { COMMANDS, ARG_TYPE, REGISTERS, REGISTERS_NAME } = require('./enums');

module.exports = class Environment {
	constructor() {
		this.register = {
			rax: 0,
			rbx: 0,
			rcx: 0,
			rdx: 0
		};
	}

	getRegisterValue(name) {
		return this.register[name];
	}

	decodeArgValue(type, val) {
		switch (type) {
		case ARG_TYPE['STRING']:
			return String.fromCharCode(val);
		case ARG_TYPE['INT']:
			return String.fromCharCode(val);
		case ARG_TYPE['REGISTER']:
			return String.fromCharCode(val);
		case ARG_TYPE['ADDRESSER']:
			return String.fromCharCode(val);
		default:
			return String(val)[0];
		}
	}

	transformArgValue(type, val) {
		switch (type) {
		case ARG_TYPE['REGISTER']:
			return {
				name: val,
				value: this.getRegisterValue(val)
			};
		default:
			return String(val);
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
			detail.argsValue[0] += this.decodeArgValue(detail.argsType[0], code[i][1]);
			detail.argsValue[1] += this.decodeArgValue(detail.argsType[1], code[i][2]);
			i++;
		}
		for (let o = 0; o < detail.argsValue.length; o++) {
			detail.argsValue[o] = detail.argsValue[o].substr(0, detail.argsLength[o]);
			detail.argsValue[o] = this.transformArgValue(detail.argsType[o], detail.argsValue[o]);
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
				let evaluation = this.parseFunctionCall(code, i);
				i = evaluation.i;
				let detail = evaluation.detail;

				switch (detail.command) {
				case COMMANDS.MOV:
					let dest = detail.argsValue[0].name ?? detail.argsValue[0];
					let value = detail.argsValue[1].value ?? detail.argsValue[1];
					if (REGISTERS_NAME.includes(dest)) {
						this.register[dest] = value;
					}
					break;
				case COMMANDS.ADD:
					console.log(
						(detail.argsValue[0] - '0')
						+
						(detail.argsValue[1] - '0')
					);
					break;
				case COMMANDS.LOG:
					if (detail.argsType[0] == ARG_TYPE.REGISTER) {
						console.log(detail.argsValue[0].value);
					} else {
						console.log(detail.argsValue[0]);
					}
					break;
				case COMMANDS.JMP:
					i = Number(detail.argsValue[0]);
					break;
				}
			}
		}
	}
};
