const path = require('path');
const fs  = require('fs');
const assert = require('assert');
const imOptim = require('..');

const rs = fs.createReadStream(path.join(__dirname, 'photo.png'));

imOptim(rs, 'image/png').then(({stream, size}) => {
	const ws = fs.createWriteStream(path.join(__dirname, 'photo.min.png'));
	stream.pipe(ws);
	stream.on('end', ()=>{
		assert(fs.statSync(path.join(__dirname, 'photo.png')).size > fs.statSync(path.join(__dirname, 'photo.min.png')).size); // ==size
		fs.unlinkSync(path.join(__dirname, 'photo.min.png'));

	})
})
.then(() => console.log('PNG optimization successful'))
.catch(console.error);


const rs2 = fs.createReadStream(path.join(__dirname, 'shape.svg'));

imOptim(rs2, 'image/svg+xml').then(({stream, size}) => {
	const ws = fs.createWriteStream(path.join(__dirname, 'shape.min.svg'));
	stream.pipe(ws);
	stream.on('end', ()=>{
		assert(fs.statSync(path.join(__dirname, 'shape.svg')).size >= fs.statSync(path.join(__dirname, 'shape.min.svg')).size); // == size
		fs.unlinkSync(path.join(__dirname, 'shape.min.svg'));

	})
})
.then(() => console.log('SVG optimization successful'))
.catch(console.error);