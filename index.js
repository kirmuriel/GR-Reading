/**
 * @file index
 * \brief
 * @author kirmuriel
 */
//
/*
@kjc restructure callbacks with step!
@kjc remove books without things
@kjc remove comments
@kjc set logs
@kjc the adventures of ...
@kjc no graph on 10
 */
var http = require('http')
	, util = require('util')
	, mu = require('mu2')
	, fs = require('fs')
	, path = require('path')
	, GRUser = require('./lib/GRUser')
	, Book = require('./lib/Book')
	, Util = Book.Util
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

			var book = Book.createBook(rawBook.title, rawBook.hash);
			book.rawReadUpdates = rawBook.rawReadUpdates;
			book.totalPages = rawBook.totalPages;
			book.finishedOn = rawBook.finishedOn;
			book.needsUpdate = rawBook.needsUpdate;
			book.shelf = rawBook.shelf;

			book.getStatusUpdates(function (err) {
				if(err)console.log(err);
				else{
					book.completeInfo(user.userIdName(), function (err) {
						if(err) console.log(err);
						require('./lib/functions').getAllData(book,function(err, data){
							if(err) console.log(err);
							console.log("::", book.title, "::");
							response.writeHead(200, { 'Content-Type':contentType });
							response.end(JSON.stringify(data), 'utf-8');
						});
					});
				}
			});

		} else if (url_parts.query.indexOf("all") == 0) {
			user.getLibrary(8, function (err) {
				if(err)console.log(err);
				var library = user.library;
				var books = library.getBooks();
				require('./lib/functions').graphAll(books, function (err, data) {
					if(err)console.log(err);
					response.writeHead(200, { 'Content-Type':contentType });
					response.end(JSON.stringify(data), 'utf-8');
				});
			});
		}
	}else{

		if (filePath == './') {
			user.getLibrary(8, function (err) {
				if(err)console.log(err);
				var library = user.library;
				var hashes = [], books = [];
				var hash,i,sortedHashes=[], updates;
				for (hash in library.books){
					if(library.books.hasOwnProperty(hash)){
						updates = library.books[hash].rawReadUpdates;
						if (updates && updates[0]) {
							sortedHashes.push({hash:hash, date:updates[0].date});
						}
					}
				}
				Util.sortByDate(sortedHashes);
				for (i=0;i<sortedHashes.length;i++) {
					hash = sortedHashes[i].hash;
					hashes.push({hash:hash});
					books.push({book:JSON.stringify(library.books[hash])});
				}
				//mu.clearCache();//@kjc remove on production
				var stream = mu.compileAndRender('index.html', {properName:"Isabel", userIdName:"isabel-62760", "hashes":hashes, "books":books});
				util.pump(stream, response);
			});
		} else if(filePath == './widgets.html'){
			//mu.clearCache();//@kjc remove on production
			var stream = mu.compileAndRender('widgets.html', {properName:"Isabel", userIdName:"isabel-62760"});
			util.pump(stream, response);
		}else {
			var extname = path.extname(filePath);
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
				case '.png':
					contentType = 'image/png';
					break;
				default:
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

