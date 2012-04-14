/**
 * @file index
 * \brief
 * @author kirmuriel
 */
//
/*
@kjc remove books without things
@kjc remove comments
@kjc set logs
@kjc the adventures of ...
@kjc no graph on 10
 */
	/*@kjc solve
	(node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.

	Trace:
	    at SAXStream.addListener (events.js:139:15)
	*/
var http = require('http')
	, util = require('util')
	, mu = require('mu2')
	, fs = require('fs')
	, path = require('path')
	, GRUser = require('./GRUser')
	, Book = require('./Book')
	, url = require('url')
	, querystring = require('querystring')
	;

mu.root = __dirname + '/templates';



/*if (undefined !=  (_GET ['user'])) {
	grUserIdName = _GET ['user'];
}
*/

// Configure our HTTP server.
var server = http.createServer(function (req, response) {
	var user = new GRUser("5206760-isabel");
	var filePath = '.' + req.url;
	//includes/functions.php?bookHashAll
	if(req.url.indexOf("/includes/functions.php")==0){
		var url_parts = url.parse(req.url);

		if (url_parts.query.indexOf("bookHashAll") == 0) {
			var raw = url_parts.query.replace("bookHashAll=", "");
			//console.log(raw);
			raw = raw.replace(/&quot;/ig, '"');
			raw = raw.replace(/%20/ig, ' ');
			raw = raw.replace(/%27/ig, "'");
			raw = raw.replace(/%C3%B1/ig,'ñ');
			raw = raw.replace(/%C3%BA/ig,'ú');
			raw = raw.replace(/%C3%A1/ig,'á');
			raw = raw.replace(/o%CC%81/ig, 'ó');

			raw = raw.replace(/"Cordera"/, "'Cordera'");
			//console.log(raw);
			var rawBook = JSON.parse(raw);

			var book = new Book(rawBook.title, rawBook.hash);
			book.rawReadUpdates = rawBook.rawReadUpdates;
			book.totalPages = rawBook.totalPages;
			book.finishedOn = rawBook.finishedOn;
			book.needsUpdate = rawBook.needsUpdate;
			book.shelf = rawBook.shelf;

			book.getStatusUpdates(function (bookW) {
				bookW.completeInfo(user.userIdName(), function (bookComplete) {
					require('./functions').getAllData(bookComplete,function(data){
						//console.log("::", book.title, "::");
						response.writeHead(200, { 'Content-Type':contentType });
						response.end(JSON.stringify(data), 'utf-8');
					});
				});
			});

		} else if (url_parts.query.indexOf("all") == 0) {
			//console.log(url_parts.query);
			user.getLibrary(10, function (library) {
				var books = library.getBooks();
				require('./functions').grahpAll(books, function (data) {
					//console.log("AAAAAAALLLLLLL", raw);
					response.writeHead(200, { 'Content-Type':contentType });
					response.end(JSON.stringify(data), 'utf-8');
				});
			});
			/*
				grUser = getUserFromSessionFile();
	library = grUser.getLibrary();
	books = library.books;
	grahpAll(books);
			 */

		}
	}else{

		if (filePath == './') {
			user.getLibrary(10, function (library) {
				var hashes = [], books = [];
				//console.log(library.titleHash);
				for (var i=0;i<library.hashes.length;i++) {
					hashes.push({hash:library.hashes[i]});
					books.push({book:JSON.stringify(library.books[library.hashes[i]])});
				}
				mu.clearCache();//@kjc remove on production
				var stream = mu.compileAndRender('index.html', {properName:"Isabel", userIdName:"isabel-62760", "hashes":hashes, "books":books});
				util.pump(stream, response);
			});
		} else {
			var extname = path.extname(filePath);
			//console.log(extname);
			var contentType = 'text/html';
			switch (extname) {
				case '.js':
					contentType = 'text/javascript';
					break;
				case '.css':
					contentType = 'text/css';
					break;
				case '.jpg':
					contentType = 'image/jpeg';
					break;
				default:
					//console.log('request url:'+req.url);
			}
			path.exists(filePath, function (exists) {
				if (exists) {
					fs.readFile(filePath, function (error, content) {
						if (error) {
							response.writeHead(500);
							response.end();
						} else {
							response.writeHead(200, { 'Content-Type':contentType });
							response.end(content, 'utf-8');
						}
					});
				} else {
					response.writeHead(404);
					response.end();
				}
			});
		}
	}
});

// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(8080);

