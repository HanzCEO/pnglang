const fs = require('fs');
const interpreter = require('../interpreter');

const Jimp = require('jimp');

let code = interpreter.asmToCode(fs.readFileSync(process.argv[2]).toString());

Jimp.read(process.argv[3], (err, output) => {
	if (err) throw err;

	let i = 0;
	let finished = false;
	for (let x = 0; x < output.bitmap.width; x++) {
		if (finished) break;
		for (let y = 0; y < output.bitmap.height; y++) {
			let color = Jimp.intToRGBA(output.getPixelColor(x, y));
			let inst = code[Math.floor(i / 3)]?.[i % 3];

			if (inst === undefined) {
				finished = true;
				break;
			}

			output.setPixelColor(Jimp.rgbaToInt(color.r, color.g, color.b, inst), x, y);
			i++;
		}
	}

	output.write(`${process.argv[3]}.png`);
});
