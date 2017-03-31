const os = require('os');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const {execFile} = require('child_process');
const pngquant = require('pngquant-bin');
const optipng = require('optipng-bin'); // almost nothing, ~1% after pngquant
// const zopflipng = require('zopflipng-bin'); // optimize well, like 20% after pngquant, but really slow, ~20s per image
const mozjpeg = require('mozjpeg');
// const jpegtran = require('jpegtran-bin');
const SVGO = require('svgo');

const svgoOptions = {floatPrecision:2, multipass:true, plugins: [
	// {mergePaths: false}, 
	{removeUselessStrokeAndFill: {removeNone:true}},
	{convertShapeToPath: false}
]};

/*
todo refactor, to make it compatible with multiparty, with uploadDir: join(os.tmpdir(), '_something')
*/




// optimize image received from http req, return readable stream, typically you pipe it in a http response, or send it with fetch or knox
// don't forget res.header('Content-Type', req.header('Content-Type'));
// would be really great to emscripten optipng, pngquant, and mozjpeg
function imageOptim(req) {

	// req.pipe(res);
	const folder = fs.mkdtempSync(path.join(os.tmpdir(), '_imgoptim_'));
	
	switch (req.header('Content-Type')) {
		case 'image/png':
			const keys = Object.keys(req.query);
			const fns = keys.length ? keys.map(k => handlerMap[k.toLowerCase()]).filter(x=>x) : [pngQuant, optiPng]; // specify order there ['pngquant', 'mozjpeg'] by default
	
			return pngOptimize(req, folder, fns)
			.catch( e => {
				console.error(e, 'OPTIM ERROR..TODO try again 1 or 2 times then return best attempt');
				return req;
			});

		case 'image/jpeg':

			return jpgOptimize(req, folder)
			.catch( e => {
				console.error(e, 'OPTIM ERROR.. TODO try again 1 or 2 times then return best attempt');
				return req;
			});

		case 'image/svg+xml':
			return svgOptimize(req);

		default: 
			throw new Error('Content-Type not supported '+req.header('Content-Type'));
	}
};



// take folder, input stream, optional list of optimizers and return output stream of optimized image
const pngOptimize = (inputStream, folder, optimizers = [pngQuant, optiPng]) => optimizers.reduce(
		(p, fn, i) => p.then(() => fn(folder, (i+1)+'.png', (i+2)+'.png')), writeStream(inputStream, path.join(folder, '1.png'))
	)
	.then(() => {
		const outStream = fs.createReadStream(path.join(folder, (optimizers.length+1)+'.png'));
		outStream.on('end', () => {
			fs.unlink(folder, () => {});
		});
		return outStream;
	});


// same for jpg
const jpgOptimize = (inputStream, folder) => writeStream(inputStream, path.join(folder, '1.jpg'))
	.then(() => mozJpeg(folder, '1.jpg', 'mj.jpg'))
	.then(() => {
		const outStream = fs.createReadStream(path.join(folder, 'mj.jpg'));
		outStream.on('end', ()=>{
			fs.unlink(folder, () => {});
		});
		return outStream;
	});



const svgOptimize = inputStream => readAsBuffer(inputStream)
	.then(buffer => {
		const svgString = buffer.toString();
		return new SVGO(svgoOptions).optim(svgString).then(svgjs => svgjs.data)
	})
	.then(svgStr => {
		var s = new stream.Readable();
		s._read = function noop() {};
		s.push(svgStr);
		s.push(null);
		return s;
	});





function writeStream(req, path) {
	return new Promise((resolve, reject) => {
		const s = fs.createWriteStream(path);
		req.pipe(s);
		s.on('finish', resolve);
	})
}

const readAsBuffer = (s, maxsize=1e7) =>
	new Promise((resolve, reject) => {
		const bufs = [];
		s.on('data', d => {
			bufs.push(d);
			if (bufs.reduce((s,b)=>s+b.length) > maxsize) return reject(new AppError('File too large (10MB max'));
		});
		s.on('end', () => {
			resolve(Buffer.concat(bufs));
		});
	});


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

const handlerMap = {
	pngquant: pngQuant,
	optipng: optiPng
}


module.exports = Object.assign(imageOptim, {pngOptimize, jpgOptimize, svgOptimize});
