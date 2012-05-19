/**
 * @file books.js
 * \brief
 */
try {
	jQuery.noConflict();
} catch (e) {
}
google.load('visualization', '1', {packages:['corechart']});

var reponse = {
	title:"",
	calculatedFinishDate:"",
	finishDate:"",
	color:"",
	totalPages:0,
	stats:{"var":0, std:0, avg:0, count:0, sum:0},
	data:{page:[], date:[], delta:[]},
	updatesDates:[],
	finishedOn:"",
	line:{m:0, b:0}
};

var allData = {
	points:{},
	titles:{}
};

jQuery(document).ready(function () {
	jQuery.getJSON('getGraphInfo', function (data) {
		draw(data);
	});
	jQuery.each(myBooksData, function (index, bookData) {
		jQuery.getJSON('getBookInfo?hash=' + bookData, function (data) {
			if (data.totalPages == 0) {
				console.log(data.title + "[" + data.totalPages + "]");
			}
			var bookHash = data.hash;
			google.setOnLoadCallback(drawData(bookHash, data));
			setBookDataTable(bookHash, data);
		});
	});
});

function draw(allData) {
	var data = new google.visualization.DataTable();
	var divId = 'mysuperdiv';
	var i, hash, points;

	data.addColumn('date', 'Day');
	for(hash in allData.titles){
		if(allData.titles.hasOwnProperty(hash)){
			data.addColumn('number', allData.titles[hash]);
		}
	}

	points = allData.points;
	for (i = 0; i < points.length; i++) {
		points[i][0] = new Date(parseInt(points[i][0]));
	}
	data.addRows(points);

	var options = {
		width:1200,
		height:200,
		titleTextStyle:{color:'black'},
		hAxis:{gridlines:{count:10 }, minValue:0, maxValue:100 },
		vAxis:{minValue:0, maxValue:100 },
		lineWidth:1,
		legend:'none'
	};

	var chart = new google.visualization.LineChart(document.getElementById(divId));
	chart.draw(data, options);
}
function drawData(bookHash, response) {

	var points = [];
	var avg = response.stats.avg;
	var totalDays = response.data.page.length;
	var m = response.line.m;
	var b = response.line.b;
	if (response.color == "red" && response.totalPages != 0) {
		//Unfinished book!
		totalDays = Math.ceil(response.totalPages / avg);
	}

	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Day');
	data.addColumn('number', 'Page');
	data.addColumn('number', 'Expected');
	data.addColumn('number', 'Delta');
	data.addColumn('number', 'Average');
	data.addColumn('number', 'Projection');

	points.push([ 0, 0 , 0, 0, avg, b - m]);
	for (var i = 0; i < totalDays; i++) {
		points.push([ (i + 1), response.data.page[i], Math.round(avg * (i + 1)), response.data.delta[i] , Math.round(avg * 10) / 10, Math.round((m * i + b) * 10) / 10   ]);
	}

	data.addRows(points);

	var options = {
		width:500,
		height:240,
		title:response.title + ' : ' + response.finishDate + ' ' + response.calculatedFinishDate,
		titleTextStyle:{color:response.color},
		hAxis:{title:'Day', gridlines:{count:( totalDays + 1) }, minValue:0, maxValue:( totalDays - 1 ) },
		vAxis:{title:response.title + " ( " + response.totalPages + " )", minValue:0, maxValue:100 },
		lineWidth:1,
		legend:'none'
	};

	var chart = new google.visualization.LineChart(document.getElementById("chart_" + bookHash));
	chart.draw(data, options);
}

function setBookDataTable(bookHash, response) {
	var style = " style='border-bottom : hidden;'";
	var il = document.getElementById(bookHash);
	var html = "<table class='tableList '>" +
		"<tbody>" +
		"<tr>" +
		"<th colspan='3'>" +
		"<span class='headerBookTitle'> <a href='#" + bookHash + "_chart'>" + response.title + /**/ "[" + response.totalPages + "]" + /**/"</a></span>" +
		"<span class='toRight'>" + /**/response.finishedOn + /**/ "</span>" +
		"</th>" +
		"</tr>" +
		"</tbody>" +
		"<tbody>";

	var numUpdates = response.data.page.length;
	for (var i = numUpdates - 1; i >= 0; i--) {
		var date = response.updatesDates[numUpdates - i - 1];

		if (i == 0) { //remove last line
			html += ("<tr" + style + ">");
		} else {
			html += ("<tr  >");
		}

		//html += ("<td class='dateCol'>" + date  + "</td>");
		html += ("<td class='dateCol'>" + (new Date(parseInt(date))).toUTCString().substr(0, 16) + "</td>");
		html += ("<td class='pageCol'>" + response.data.page[i] + "</td>");
		html += ("<td class='pageCol'>" + response.data.delta[i] + "</td>");
		html += "</tr>";
	}
	html += "</tbody>" +
		"</table>";
	il.innerHTML = html;
}
