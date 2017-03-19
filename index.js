const os = require('os');
const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const pngquant = require('pngquant-bin');
const optipng = require('optipng-bin'); // almost nothing, ~1% after pngquant
// const zopflipng = require('zopflipng-bin'); // optimize well, like 20% after pngquant, but really slow, ~20s per image
const mozjpeg = require('mozjpeg');
// const jpegtran = require('jpegtran-bin');

/*
todo refactor, to make it compatible with multiparty, with uploadDir: join(os.tmpdir(), '_something')
*/

// optimize image received from http req, return readable stream, typically you pipe it in a http response, or send it with fetch or knox
// don't forget res.header('Content-Type', req.header('Content-Type'));
// would be really great to emscripten optipng, pngquant, and mozjpeg
module.exports = function imageOptim(req) {

	// req.pipe(res);
	const folder = fs.mkdtempSync(path.join(os.tmpdir(), '_imgoptim_'));
	const stream = fs.createWriteStream(path.join(folder, '1.png'));
	
	switch (req.header('Content-Type')) {
		case 'image/png':
			if (req.query.optipng!==undefined) { // optipng only
				return writeStream(req, path.join(folder, '1.png'))
				.then(() => optiPng(folder, '1.png', '2.png'))
				.then(() => {
					const outStream = fs.createReadStream(path.join(folder, '2.png'));
					outStream.on('end', ()=>{
						fs.unlink(folder, () => {});
					});
					return outStream;
				})
				.catch( e => req);
			}
			if (req.query.pngquant!==undefined) { // pngquant only
				return writeStream(req, path.join(folder, '1.png'))
				.then(() => pngQuant(folder, '1.png', '3.png'))
				.then(() => {
					const outStream = fs.createReadStream(path.join(folder, '3.png'));
					outStream.on('end', ()=>{
						fs.unlink(folder, () => {});
					});
					return outStream;
				})
				.catch( e => req);
			}
			return writeStream(req, path.join(folder, '1.png'))
			.then(() => optiPng(folder, '1.png', '2.png'))
			.then(() => pngQuant(folder, '2.png', '3.png'))
			.then(() => {
				const outStream = fs.createReadStream(path.join(folder, '3.png'));
				outStream.on('end', ()=>{
					fs.unlink(folder, () => {});
				});
				return outStream;
			})
			.catch( e => {
				console.error(e, 'OPTIM ERROR..TODO try again 1 or 2 times then return best attempt');
				return req;
			});

		case 'image/jpeg':

			return writeStream(req, path.join(folder, '1.jpg'))
			.then(() => mozJpeg(folder, '1.jpg', 'mj.jpg'))
			.then(() => {
				const outStream = fs.createReadStream(path.join(folder, 'mj.jpg'));
				outStream.on('end', ()=>{
					fs.unlink(folder, () => {});
				});
				return outStream;
			})
			.catch( e => {
				console.error(e, 'OPTIM ERROR.. TODO try again 1 or 2 times then return best attempt');
				return req;
			});

		default: 
			throw new Error('Content-Type not supported '+req.header('Content-Type'));
	}
};





function writeStream(req, path) {
	return new Promise((resolve, reject) => {
		const stream = fs.createWriteStream(path);
		req.pipe(stream);
		stream.on('finish', resolve);
	})
}


// if pngquant still fails, go back to execFile(pngquant, ['*.png', '--ext', '.png', '--force'], {cwd:folder}, err =>{})


function optiPng(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(optipng, ['-out', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
// '--skip-if-larger', could return empty file 
function pngQuant(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(pngquant, ['-o', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
function zopFliPng(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(zopflipng, ['-m', '--lossy_transparent', '--lossy_8bit', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
function mozJpeg(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(mozjpeg, ['-outfile', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
//  execFile(jpegtran, ['-outfile', tempPath+'_', tempPath], err => { // 

