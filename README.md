## Simple image-optimizer

uses:
 - mozjpeg
 - pngquant+optipng
 - svgo


## Usage example

```js
var imOptim = require('im-optim');
var fetch = require('node-fetch');

app.get('/:url', (req, res) => { // fetch url, optimize and send back

	fetch(req.params.url)
	.then(s => 
		imOptim(s, s.headers.get('content-type'))
		.then(({stream, size}) => {
			res.setHeader('content-type', s.headers.get('content-type'));
			res.setHeader('content-length', size); // not mandatory
			stream.pipe(res);
		})
	})
})

```