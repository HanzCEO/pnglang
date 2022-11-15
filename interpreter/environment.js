const { COMMANDS } = require('./enums');

module.exports = class Environment {
	constructor() {
		// ...
	}

	run(code) {
		for (const instruction of code) {
			switch (instruction[0]) {
			case COMMANDS.ADD:
				console.log(
					(instruction[1] - '0'.charCodeAt(0))
					+
					(instruction[2] - '0'.charCodeAt(0))
				);
				break;
			}
		}
	}
};
