
const path = require('path');
const fs  = require('fs');
const imageOptim = require('../');

const rs = fs.createReadStream(path.join(__dirname, 'photo.png'));
rs.headers = {'content-type': 'image/png'}; // bad, but wil figure better way
rs.query={};
imageOptim(rs).then(stream => {
	const ws = fs.createWriteStream(path.join(__dirname, 'photo.min.png'));
	stream.pipe(ws);
	ws.on('end', ()=>{
		assert(fs.statSync(path.join(__dirname, 'photo.png')).size > fs.statSync(path.join(__dirname, 'photo.min.png')).size);
		fs.unlinkSync(path.join(__dirname, 'photo.min.png'));

	})
}).catch(console.error);