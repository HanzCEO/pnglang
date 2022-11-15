const COMMANDS_NAME = [
	/* Reserved names */
	'EOF',
	'_string', '_int',
	'_reserved1', '_reserved2',
	'_reserved3', '_reserved4',
	'_reserved5', '_reserved6',
	'_reserved7', '_reserved8',
	'_reserved9', '_reserved10',

	/* Functions */
	'add'
];
const COMMANDS = {};

for (let i = 0; i < COMMANDS_NAME.length; i++) {
	COMMANDS[COMMANDS_NAME[i].toUpperCase()] = i;
}

module.exports = {
	COMMANDS,
	COMMANDS_NAME
};
