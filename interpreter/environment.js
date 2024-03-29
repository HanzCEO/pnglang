const path = require('path');
const { COMMANDS, ARG_TYPE, REGISTERS, REGISTERS_NAME } = require('./enums');

module.exports = class Environment {
	constructor() {
		this.register = {
			rax: 0,
			rbx: 0,
			rcx: 0,
			rdx: 0,
			zf: 0
		};
		this.importedResources = {
			coreutils: require('./modules/coreutils')
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
						if (!isNaN(Number(value))) value = Number(value);
						this.register[dest] = value;
					}
					break;
				case COMMANDS.ADD:
					// TODO: Do something for arg1 != REGISTER
					if (detail.argsType[0] == ARG_TYPE.REGISTER) {
						let dest = detail.argsValue[0].name;
						if (REGISTERS_NAME.includes(dest)) {
							let val = detail.argsValue[1].value ?? detail.argsValue[1];
							if (!isNaN(Number(val))) val = Number(val);
							this.register[detail.argsValue[0].name] += val;
						}
					}
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
				case COMMANDS.TEST:
					let v1 = detail.argsValue[0].value ?? detail.argsValue[0];
					let v2 = detail.argsValue[1].value ?? detail.argsValue[1];
					this.register.zf = Number(v1 === v2);
					break;
				case COMMANDS.JE:
					if (this.register.zf == 1) {
						i = Number(detail.argsValue[0]);
						this.register.zf = 0;
					}
					break;
				case COMMANDS.JNE:
					if (this.register.zf == 0) {
						i = Number(detail.argsValue[0]);
					}
					break;
				case COMMANDS.SUB:
					if (detail.argsType[0] == ARG_TYPE.REGISTER) {
						let dest = detail.argsValue[0].name;
						if (REGISTERS_NAME.includes(dest)) {
							let val = detail.argsValue[1].value ?? detail.argsValue[1];
							if (!isNaN(Number(val))) val = Number(val);
							this.register[detail.argsValue[0].name] -= val;
						}
					}
					break;
				case COMMANDS.IMPORT:
					let mod = require(path.join(process.cwd(), detail.argsValue[0]));
					let modName = detail.argsValue[1];
					this.importedResources[modName] = mod;
					break;
				case COMMANDS.SYSCALL:
					// TODO: Write function for every 'commands' instead of doing cases like this
					let [modName2, func] = detail.argsValue[0].split('.');
					this.importedResources[modName2][func](this);
					break;
				}
			}
		}
	}
};
