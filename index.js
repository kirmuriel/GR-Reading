/**
 * @file index
 * \brief
 * @author kirmuriel
 */
//
/*
@kjc restructure callbacks with step!
@kjc no graph :(
@kjc read library just once
@kjc remove books without things
@kjc remove comments
@kjc set logs
@kjc the adventures of ...
@kjc no graph on 10
@kjc encode and decode book info
 */
var http = require('http')
	, util = require('util')
	, mu = require('mu2')
	, fs = require('fs')
	, path = require('path')
	, url = require('url')
	, GRUser = require('./lib/GRUser')
	, Book = require('./lib/Book')
	, functions = require('./lib/functions')
	, Util = Book.Util
	//, querystring = require('querystring')
	;

mu.root = __dirname + '/templates';



/*if (undefined !=  (_GET ['user'])) {
	grUserIdName = _GET ['user'];
}
*/


var server = http.createServer(function (req, response) {
	var user = new GRUser("5206760-isabel");
	var filePath = '.' + req.url;

	if (req.url.indexOf("/getBookInfo") == 0) {
		 var url_parts = url.parse(req.url);
		if (url_parts.query.indexOf("hash") == 0) {
			var raw = url_parts.query.replace("hash=", "");
			getBookInfo(user, raw, response);
		}else{
			response.writeHead(200, { 'Content-Type':'text/html' });
			response.end();
		}
	} else {
		switch (filePath) {
			case './':
				init(user, 8, response);
				break;
			case './widgets.html':
				mu.clearCache();
				var stream = mu.compileAndRender('widgets.html', {properName:"Isabel", userIdName:"isabel-62760"});
				util.pump(stream, response);
				break;
			case './getGraphInfo':
				getGraphInfo(user, 8, response);
				break;
			default:
				getStatic(filePath, response);
				break;

		}
	}
});
/*
 Client->Server: GET
  activate Server
  Server->GR : getRSSStatusUpdates()
  activate GR
  GR-->Server : statusUpdates
  Server->Server : process(statusUpdates)
  Server->Cookie :  store(statusUpdates)
  activate Cookie
  Server->Client: callback(HTML)
  activate Client
 */

function init(user,limit,response){
	functions.getFeedData(user, limit, function(err,hashes,books){
		if(err) return handleError(err, response);
		//mu.clearCache();//@kjc remove on production
		var stream = mu.compileAndRender('index.html', {properName:"Isabel", userIdName:"isabel-62760", "hashes":hashes, "books":books});
		util.pump(stream, response);
		//@kjc var library = user.library; var books = library.getBooks();
	});
}


/*
  Client->Server: getBookInfo(hash)
  Server->Cookie: get(hash)
  Cookie-->Server : data
  Server->GR : getBookInfo(bookTitle)
  GR-->Server : info
  Server->Cookie : store(info)
  Server->Server : process(info)
  Server->Client: callback(bookInfo)
  Client->Client : display(bookInfo)
  */
function getBookInfo(user, raw, response){
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
	book.getStatusUpdates(function (err) {
		if(err) return handleError(err, response);
		book.completeInfo(user.userIdName(), function (err) {
			if (err) return handleError(err, response);
			functions.getAllData(book, function (err, data) {
				if(err) return handleError(err, response);
				//console.log("::", book.title, "::");
				response.writeHead(200, { 'Content-Type':'text/html' });
				response.end(JSON.stringify(data), 'utf-8');
			});
		});
	});
	book.shelf = rawBook.shelf;
}


/*
  Client->Server: getGraphInfo()
  Server->Cookie: getAll()
  Cookie-->Server : allData
  Server->Server : process(allData)
  Server->Client: callback(graphInfo)
  Client->Client : display(graphInfo)
  */
function getGraphInfo(user, limit, response){
	user.getLibrary(limit, function (err) {
		if(err) return handleError(err,response);
		var library = user.library;
		var books = library.getBooks();
		functions.graphAll(books, function (err, data) {
			if(err) return handleError(err,response);
			response.writeHead(200, { 'Content-Type':'text/html'  });
			response.end(JSON.stringify(data), 'utf-8');
		});
	});
}
/*
  Client->Server : getStaticContent(id)
  Server->Client : callback(staticContent)
  */
function getStatic(filePath, response){
	var extension = path.extname(filePath);
	var contentType = 'text/html';
	switch (extension) {
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
			fs.readFile(filePath, function (err, content) {
				if (err) {
					handleError(err, response);
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

function handleError(err, response){
	console.log(err);
	response.writeHead(500);
	response.end();
}
// Listen on port 8000, IP defaults to 127.0.0.1
server.listen(8080);

