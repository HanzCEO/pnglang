let interpreter = require('./index');

(async () => {
	let res = await interpreter.interpretFile(process.argv[2]);
	console.log(res);
})();
