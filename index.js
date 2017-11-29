const os = require('os');
const fs = require('fs');
const path = require('path');
const {Readable} = require('stream');
const {execFile} = require('child_process');
const pngquant = require('pngquant-bin');
const optipng = require('optipng-bin'); // almost nothing, ~1% after pngquant
// const zopflipng = require('zopflipng-bin'); // optimize well, like 20% after pngquant, but really slow, ~20s per image
const mozjpeg = require('mozjpeg');
const asBuffer = require('as-buffer');
// const jpegtran = require('jpegtran-bin');
const SVGO = require('svgo');

const svgoOptions = {floatPrecision:2, multipass:true, plugins: [
	// {mergePaths: false}, 
	{removeUselessStrokeAndFill: {removeNone:true}},
	{convertShapeToPath: false}
]};

const tmpFolder = () => fs.mkdtempSync(path.join(os.tmpdir(), '_imoptim_'));

const getSize = (path) =>
	new Promise((resolve, reject) => {
		fs.stat(path, (err, stat) => {
			if (err) return reject(err);
			resolve(stat.size);
		})
	});


// generic image optimize from stream and type
function imOptim(stream, type=stream.headers&&stream.headers['content-type']) {

	const optimizer = optimizers.get(type);
	if (!optimizer) throw new Error('Content-Type not supported '+type);

	return optimizer(stream);
};



// optimizers per type: they take a stream, return {stream, size}

const jpgOptim = (stream, folder = tmpFolder()) => 
	writeFile(stream, path.join(folder, '1'))
	.then(() => mozJpeg(folder, '1', '2'))
	.then(() => Promise.all([
		getSize(path.join(folder, '1')),
		getSize(path.join(folder, '2'))
	]))
	.then(([size1, size2]) => {
		const [stream, size] = size2 < size1 ? 
			[fs.createReadStream(path.join(folder, '2')), size2] : 
			[fs.createReadStream(path.join(folder, '1')), size1];

		fs.unlink(path.join(folder, '1'), ()=>{});
		fs.unlink(path.join(folder, '2'), ()=>{});
		fs.rmdir(folder, () => {}); // or maybe Promise.all(above).then(fs.rmdr..)

		return {stream, size};
	});


const pngOptim = (stream, folder = tmpFolder()) => 
	writeFile(stream, path.join(folder, '1'))
	.then(() => pngQuant(folder, '1', '2'))
	.then(() => optiPng(folder, '2', '3'))
	.then(() => Promise.all([
		getSize(path.join(folder, '1')),
		getSize(path.join(folder, '2')),
		getSize(path.join(folder, '3'))
	]))
	.then(([size1, size2, size3]) => {
		const [stream, size] = size3 < size1 && size3 < size2 ? 
			[fs.createReadStream(path.join(folder, '3')), size3] :
			size2 < size1 ?
			[fs.createReadStream(path.join(folder, '2')), size2] :
			[fs.createReadStream(path.join(folder, '1')), size1];

		fs.unlink(path.join(folder, '1'), ()=>{});
		fs.unlink(path.join(folder, '2'), ()=>{});
		fs.unlink(path.join(folder, '3'), ()=>{});
		fs.rmdir(folder, () => {}); // or maybe Promise.all(above).then(fs.rmdr..)
	
		return {stream, size};
	});


const svgOptim = stream => asBuffer(stream)
	.then(buffer => {
		const svgString = buffer.toString();
		return new SVGO(svgoOptions).optimize(svgString).then(svgjs => svgjs.data)
	})
	.then(svgStr => {
		var s = new Readable();
		s._read = function noop() {};
		s.push(svgStr);
		s.push(null);
		return {stream: s, size: svgStr.length};
	});


const optimizers = new Map([
	['image/png', pngOptim],
	['image/jpeg', jpgOptim],
	['image/svg+xml', svgOptim]
]);


// const unlink = path =>
// 	new Promise((resolve, reject) => {
// 		fs.unlink(path, err => err ? reject(err) : resolve());
// 	});


const writeFile = (stream, path) => 
	new Promise((resolve, reject) => {
		if (Buffer.isBuffer(stream)) return fs.writeFile(path, stream, (err) => err?reject(err) : resolve());
		const s = fs.createWriteStream(path);
		stream.pipe(s);
		s.on('finish', resolve);
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
// '--skip-if-larger', could return empty file, '--nofs' for no dithering
function pngQuant(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(pngquant, ['-o', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
// function zopFliPng(folder, input, output) {
// 	return new Promise((resolve,reject) => {
// 		execFile(zopflipng, ['-m', '--lossy_transparent', '--lossy_8bit', path.join(folder, output), path.join(folder, input)], err => {
// 			if (err) return reject(err);
// 			resolve();
// 		});
// 	})
// }
function mozJpeg(folder, input, output) {
	return new Promise((resolve,reject) => {
		execFile(mozjpeg, ['-outfile', path.join(folder, output), path.join(folder, input)], err => {
			if (err) return reject(err);
			resolve();
		});
	})
}
//  execFile(jpegtran, ['-outfile', tempPath+'_', tempPath], err => { // 




module.exports = Object.assign(imOptim, {pngOptim, jpgOptim, svgOptim});
