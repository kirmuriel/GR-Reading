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
	numDays:0,
	maxVal:0,
	totalPages:0,
	stats:{"var":0, std:0, avg:0, count:0, sum:0},
	data:{page:[], date:[], delta:[]},
	updatesDates:[],
	finishedOn:""
};

jQuery(document).ready(function () {
	jQuery.each(myBooks, function (index, bookHash) {
		jQuery.getJSON('includes/functions.php?bookHashAll=' + bookHash, function (data) {
			if (data.totalPages == 0) {
				console.log(data.title + "[" + data.totalPages + "]");
			}
			google.setOnLoadCallback(drawData(bookHash, data));
			setBookDataTable(bookHash, data);
		});
	});
});

function drawData(bookHash, response) {

	var points = [];
	var avg = response.stats.avg;
	var numUpdates = response.data.page.length;
	var totalDays=numUpdates;
	if(response.color == "red" && response.totalPages != 0){
		//Unifinished book!
		totalDays =  Math.ceil(response.totalPages/avg);
	}

	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Day');
	data.addColumn('number', 'Page');
	data.addColumn('number', 'Expected');
	data.addColumn('number', 'Delta');
	data.addColumn('number', 'Average');

	points.push([ 0, 0 , 0, 0, avg]);
	for (var i = 0; i < totalDays ; i++) {
		points.push([ (i + 1), response.data.page[i], avg*(i+1),  response.data.delta[i] , avg]);
	}


	console.log(response.title + ": " + points);
	/*for (i = numUpdates; i < totalDays; i++) {
		console.log(response.title + ": " +totalDays + " - "+ numUpdates );
		points.push([ (i + 1), undefined, avg*(i+1),  undefined , avg]);
	}*/
	data.addRows(points);

	var options = {
		width: 500,
		height: 240,
		title: response.title + ' : ' + response.calculatedFinishDate + ' ' + response.finishDate,
		titleTextStyle: {color: response.color},
		hAxis: {title: 'Day', gridlines: {count: ( totalDays + 1) }, minValue: 0, maxValue: ( totalDays - 1 ) },
		vAxis: {title: response.title + " ( "+response.totalPages + " )", minValue: 0, maxValue: 100 },
		lineWidth: 1,
		legend: 'none'
	};

	var chart = new google.visualization.LineChart(document.getElementById("chart_" + bookHash));
	chart.draw(data, options);
}

function setBookDataTable(bookHash, response){
	//new Date(date * 1000)
	var style = " style='border-bottom : hidden;'";
	var il = document.getElementById(bookHash);
	var html = "<table class='tableList '>" +
				"<tbody>" +
				"<tr>" +
				"<th colspan='3'>" +
				"<span class='headerBookTitle'> <a href='#"+bookHash+"_chart'>" + response.title + /**/ "[" + response.totalPages + "]"+/**/"</a></span>" +
				"<span class='toRight'>" + /**/response.finishedOn +/**/ "</span>" +
				"</th>" +
				"</tr>" +
				"</tbody>" +
				"<tbody>";

	var numUpdates = response.data.page.length;
	for (i = numUpdates-1; i >= 0; i--) {
		var date = response.updatesDates[numUpdates - i - 1];

		if(i == 0){ //remove last line
			html += ("<tr" + style +">");
		}else{
			html += ("<tr  >");
		}

		//html += ("<td class='dateCol'>" + date  + "</td>");
		html += ("<td class='dateCol'>" + new Date(date * 1000).toUTCString().substr(0,16) + "</td>");
		html += ("<td class='pageCol'>" + response.data.page[i] + "</td>");
		html += ("<td class='pageCol'>" + response.data.delta[i] + "</td>");
		html += "</tr>";
	}
	html += "</tbody>" +
			"</table>";
	il.innerHTML = html;
}