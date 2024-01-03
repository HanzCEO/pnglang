const Jimp = require('jimp');

async function extractCode(filename) {
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

			resolve(code);
		});
	});
}

const fileToRead = process.argv[2];
(async () => {
    const thecode = await extractCode(fileToRead);
    console.table(thecode);
})();