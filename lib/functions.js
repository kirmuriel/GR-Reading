//                   ppw --source src --tests tests --name bookstats --bootstrap src/autoload.php .
var GRUser = require('./GRUser')
	, Book = require('./Book')
	, mu = require('mu2')
	, util = require('util')
	, moment = require('moment')

	;
mu.root = __dirname + '/../templates';

function array_reverse(array) {
	var tmp_arr = [];
	for (var key in array) {
		if (array.hasOwnProperty(key)) {
			tmp_arr.unshift(array[key]);
		}
	}
	return tmp_arr;
}

/**
 * Get all the info for a book from a raw book
 * @param {Object} rawBook raw book info
 * @param {string} userIdName user id (id-name)
 * @param {function} callback params:Book
 */
function getBookInfo(rawBook, userIdName, callback) {
	/* @var book Book */
	var book = new Book(rawBook.title, rawBook.hash);
	book.rawReadUpdates = rawBook.rawReadUpdates;
	book.totalPages = rawBook.totalPages;
	book.finishedOn = rawBook.finishedOn;
	book.needsUpdate = rawBook.needsUpdate;
	book.shelf = rawBook.shelf;
	book.completeInfo(userIdName, function (book) {
		/* @var book Book */
		book.getStatusUpdates(callback);
	});
}
/**
 * Display the html based on the status update feed
 * @param {GRUser} grUser GR user to get the feed from
 * @param {int} numPages Number of pages of the feed
 * @param {stream} writeStream Stream to where to write the html
 */
function getFeedData(grUser, numPages, writeStream) {
	/* @var grUser GRUser */
	grUser.getLibrary(numPages, function (library) {
		//console.log(library.titleHash);
		var hashes = [], books = [];
		for (var title in library.titleHash) {
			if (library.titleHash.hasOwnProperty(title)) {
				hashes.push({hash:library.titleHash[title]});
				books.push({book:JSON.stringify(library.books[library.titleHash[title]])});
			}
		}
		//mu.clearCache();//@kjc remove on production
		var stream = mu.compileAndRender('index.html', {properName:"Isabel", userIdName:"isabel-62760", "hashes":hashes, "books":books});
		util.pump(stream, writeStream);
	});
}

function sort(numericArray) {
	var sorter = function (a, b) {
		return (a - b);
	};
	numericArray.sort(sorter);
}
/**
 * Gets all data for a given book and formats it for display
 * @param {Book} book The book to get the data from.
 * @param {function} callback function(Array). Receives an array with the formated book data for display
 */
function getAllData(book, callback) {
	book.getStatusUpdates(function (book) {
		/* @var book Book*/
		var response = {};
		var dateFinishedHeader = (book.getFinishedOn() === 0) ? "" : moment(book.getFinishedOn()*1000).format('ddd D MMM \'YY HH:mm');
		var finish = book.getFinishedOn();
		var totalPages = book.getTotalPages();

		var updates = book.dailyUpdates;
		class_log(book.hash,updates);
		var data = normalizePoints(updates);
		var stats = statistics(data['delta']);
		var constStats = stats;
		var updatesDates = Object.keys(updates);
		class_log(book.hash,updatesDates);
		class_log(book.hash, book.title);
		class_log(book.hash, updatesDates);
		try {
			if (data['page'].length > 1 && totalPages != 0) {
				var line = getLine(updates);
				finish = line["m"] * totalPages + line["b"];

				var delta = data['delta'].slice(0);
				delta.sort(function (a, b) {return (a - b);});

				var constArray = getConstantArray(delta, totalPages);
				constStats = statistics(constArray);

				class_log(book.hash, finish);
				class_log(book.hash, "delta", delta);
				class_log(book.hash, "constarray", constArray);
				class_log(book.hash, "statistics", constStats);
			}
		} catch (e) {
			console.log(e.message);
			console.log(e);
		}

		var maxVal = (data['date'][0] - (data['date'][0] % 120) + 115) / 24;
		response['hash'] = book.getHash();
		response['calculatedFinishDate'] = moment(finish*1000).format("ddd, D MMM YYYY HH:mm:ss Z");
		response['finishDate'] = ((book.getFinishedOn() != 0) ? "{" + moment(book.getFinishedOn()*1000).format("ddd, D MMM YYYY HH:mm:ss Z") + "}" : "");
		response['color'] = ((book.getFinishedOn() != 0) ? "black" : "red");
		response['numDays'] = Math.ceil(maxVal) + 1;//24;
		response['maxVal'] = maxVal;
		response['stats'] = stats;
		response['data'] = data;
		response['updatesDates'] = array_reverse(updatesDates);
		response['title'] = book.getTitle();
		response['totalPages'] = totalPages;
		response['finishedOn'] = dateFinishedHeader;
		response['constStats'] = constStats;
		class_log(book.hash, "alldata resp", response);
		callback(response);
	});
}


function array_merge(array1, array2) {
	return array1.concat(array2);

}
function unique(array) {
	var unique = [];
	for (var i = 0; i < array.length; i++) {
		if (unique.indexOf(array[i]) === -1) {
			unique.push(array[i]);
		}
	}
	return unique;
}
/**/
function grahpAll(books, callback) {
	var response = {};
	var allUpdateDates = [];
	var matrix = {};
	var bookTitles = {};
	var bookPages = {};
	var booksProcessed = 1;
	var lasBook = false;

	for (var i = 0; i < books.length; i++) {

		/**@var {Book} book*/
		var book = books[i];
		book.getStatusUpdates(function (book) {
			var updates = book.dailyUpdates;
			//console.log(book);
			var updatesDates = Object.keys(updates);
			allUpdateDates = array_merge(allUpdateDates, updatesDates);
			var hash = book.hash;
			bookTitles[hash] = book.getTitle().substr(0, 15);
			bookPages[hash] = book.getTotalPages();
			lasBook = (++booksProcessed == books.length);
		//	console.log(book.title, booksProcessed, lasBook, books.length);
			if (lasBook) {
				allUpdateDates = unique(allUpdateDates);
				sort(allUpdateDates);
				for (var k = 0; k < allUpdateDates.length; k++) {
					var date = allUpdateDates[k];
					matrix[date] = {};
					(function (date, index) {
						for (var j = 0; j < books.length; j++) {
							var bookj = books[j];
							(function (bookIndex) {
								bookj.getStatusUpdates(function (bookj) {
									var hash = bookj.hash;
									var updatesj = bookj.dailyUpdates;
									if (undefined != (updatesj[date])) {
										matrix[date][hash] = updatesj[date];
									} else {
										matrix[date][hash] = "undefined";
									}
								//	console.log(date, index, bookIndex);
									if (index + 1 == allUpdateDates.length && bookIndex + 1 == books.length) {
										response['matrix'] = matrix;
										response['titles'] = bookTitles;
										response['pages'] = bookPages;
										//console.log(response);
										callback(response);
									}
								});
							})(j);
						}
						//console.log(matrix);
					})(date, k);

				}

			}
		});
	}

}
/**/
/**
 * Gets the arrays of update dates, pages, and deltas from an associative array of updates
 * @param {Array} updates Associative array. date : page
 * @return {Array} data Format {page:[], date:[], delta:[]}
 */
function normalizePoints(updates) {
	//@kjc remove date
	var data = {page:[], date:[], delta:[]};
	var counter = 0;
	var prevPage = 0;
	var page = 0;
	for (var date in updates) {//} as date : page) {
		if (updates.hasOwnProperty(date)) {
			page = updates[date];
			data['date'].push(counter * 24);
			data['page'].push(page);
			if (prevPage !== 0) {
				data['delta'].push(page-prevPage);
			}
			prevPage = page;
			counter++;
		}
	}
	data['delta'].unshift(data['page'][0]);
	return data;
}

function getPoints(updates) {
	var data = {page:[], date:[]};

	for (var date in updates) {
		if (updates.hasOwnProperty(date)) {
			var page = updates[date];
			data ['date'].push(date); // 24* convert to seconds
			data ['page'].push(page);
		}
	}
	data['date'] = array_reverse(data['date']);

	var last = (data ['date']).length - 1;
	var dayInSeconds = 60 * 60 * 24;
	var lastDay = data ['date'] [0];

	for (var i = last; i >= 0; i--) {
		data ['date'] [i] = parseInt(lastDay);//parseInt
		lastDay -= (dayInSeconds);
	}
	return data;
}
/**
 *
 * @param {Array} updates
 * @return {Array} m:slope, b:intercept
 * @see linearRegression
 */
function getLine(updates) {
	var data = getPoints(updates);
	return linearRegression(data ['page'], data ['date']);
}
/**
 * linear regression function
 *
 * @param {Array} x x-coords
 * @param {Array} y y-coords
 * @return {Array} m:slope, b:intercept
 */
function linearRegression(x, y) {
	var i;
	// calculate number points
	var n = x.length;
	// ensure both arrays of points are the same size
	if (n != y.length) {
		throw("linear_regression(): Number of elements in coordinate arrays do not match.");
	}
	// calculate sums
	var x_sum = 0
		, y_sum = 0
		, xx_sum = 0
		, xy_sum = 0;
	for (i = 0; i < n; i++) {
		x_sum += x[i];
		y_sum += y[i];
		xy_sum += (x [i] * y [i]);
		xx_sum += (x [i] * x [i]);
	}
	// calculate slope
	var m = ((n * xy_sum) - (x_sum * y_sum)) / ((n * xx_sum) - (x_sum * x_sum));
	// calculate intercept
	var b = (y_sum - (m * x_sum)) / n;
	// return result
	return {"m":m, "b":b};
}

function statistics(array) {
	var count = array.length;
	var sum = 0;
	var i;
	for (i = 0; i < count; i++) {
		sum += array[i];
	}
	var avg = sum / count;
	var vrn = 0;
	for (i = 0; i < count; i++) {
		vrn += ((array[i] - avg) * (array[i] - avg));
	}
	vrn = vrn / count;
	return {"var":vrn, "std":Math.sqrt(vrn), "avg":avg, "count":count, "sum":sum};
}

function stDev(array) {
	var stats = statistics(array);
	return stats['std'];
}

function getConstantArray(sortedDeltaArray, totalPages) {

	if (sortedDeltaArray.length <= 2) {
		return sortedDeltaArray;
	}
	var stdDev = stDev(sortedDeltaArray);
	if ((stdDev * 100 / totalPages) < 4) {
		return sortedDeltaArray;
	}

	var trimMin = sortedDeltaArray.slice(0);
	trimMin.shift();
	var stDevXMin = stDev(trimMin);

	var trimMax = sortedDeltaArray.slice(0);
	trimMax.pop();
	var stDevXMax = stDev(trimMax.pop());

	var diff = Math.abs(stDevXMax - stDevXMin);

	if (diff < 1) {
		trimMin.pop();
		return getConstantArray(trimMin, totalPages);
	} else if (stDevXMax < stDevXMin) {
		return getConstantArray(trimMax, totalPages);
	} else { //  (std_xmax > std_xmin)
		return getConstantArray(trimMin, totalPages);
	}
}


function class_log() {
	if (arguments[0] == "er") {
		for (var i = 1; i < arguments.length; i++) {
			//console.log(arguments[i]);
		}
	}
}

exports.getBookInfo = getBookInfo;
exports.getFeedData = getFeedData;
exports.normalizePoints = normalizePoints;
exports.getPoints = getPoints;
exports.getLine = getLine;
exports.linearRegression = linearRegression;
exports.statistics = statistics;
exports.stDev = stDev;
exports.getConstantArray = getConstantArray;
exports.class_log = class_log;
exports.getAllData = getAllData;
exports.grahpAll = grahpAll;