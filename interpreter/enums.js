const COMMANDS_NAME = [
	/* Reserved names */
	'EOF',
	'cm&', 'argpart',
	'_reserved1', '_reserved2',
	'_reserved3', '_reserved4',
	'_reserved5', '_reserved6',
	'_reserved7', '_reserved8',
	'_reserved9', '_reserved10',

	/* Functions */
	'mov', 'add', 'log', 'jmp', 'test', 'je', 'jne', 'sub', 'import', 'syscall'
];
const COMMANDS = {};

for (let i = 0; i < COMMANDS_NAME.length; i++) {
	COMMANDS[COMMANDS_NAME[i].toUpperCase()] = i;
}

const ARG_TYPE_NAME = [
	/* Reserved */
	'void',
	'_reserved', '_reserved0',
	'_reserved1', '_reserved2',
	'_reserved3', '_reserved4',
	'_reserved5', '_reserved6',
	'_reserved7', '_reserved8',
	'_reserved9', '_reserved10',

	/* Primitives */
	'string', 'int', 'register', 'addresser'
];
const ARG_TYPE = {};

for (let i = 0; i < ARG_TYPE_NAME.length; i++) {
	ARG_TYPE[ARG_TYPE_NAME[i].toUpperCase()] = i;
}

const REGISTERS_NAME = [
	/* Reserved */
	'_reserved', '_reserved0',
	'_reserved1', '_reserved2',
	'_reserved3', '_reserved4',
	'_reserved5', '_reserved6',
	'_reserved7', '_reserved8',
	'_reserved9', '_reserved10',

	/* Regulars */
	'rax', 'rbx', 'rcx', 'rdx', 'zf'
];
const REGISTERS = {};

for (let i = 0; i < REGISTERS_NAME.length; i++) {
	REGISTERS[REGISTERS_NAME[i].toUpperCase()] = i;
}

module.exports = {
	COMMANDS,
	COMMANDS_NAME,

	ARG_TYPE_NAME,
	ARG_TYPE,

	REGISTERS,
	REGISTERS_NAME
};
