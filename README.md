## Simple image-optimizer for png, jpg, svg

uses:
 - mozjpeg
 - pngquant+optipng
 - svgo

## API

```js
var imOptim = require('im-optim');
// imOptim(stream [, contentType]) -> {stream:optimizedStream, size}
// imOptim.pngOptim(stream) -> {stream:optimizedStream, size}
// imOptim.jpgOptim(stream) -> {stream:optimizedStream, size}
// imOptim.svgOptim(stream) -> {stream:optimizedStream, size}

```

## Usage example

```js
var imOptim = require('im-optim');
var fetch = require('node-fetch');

app.get('/:url', (req, res) => { // optimizer proxy: fetch url, optimize and send back

	fetch(req.params.url)
	.then(s => imOptim(s, s.headers.get('content-type'))
		.then(({stream, size}) => {
			res.setHeader('content-type', s.headers.get('content-type'));
			res.setHeader('content-length', size); // not mandatory
			stream.pipe(res);
		})
	})
	.catch(e => res.send(e));
})

```