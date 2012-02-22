try {
	jQuery.noConflict();
} catch(e) {}

jQuery.each(myBooks, function(index, bookHash) {
	jQuery.getJSON('includes/functions.php?bookHash=' + bookHash, function(data) {
		if (data.totalPages == 0) {
			console.log(data.title + "[" + data.totalPages + "]");
		}
		setBookDataTable(bookHash, data);
	});
});
function setBookDataTable(bookHash, data){
	var il = document.getElementById(bookHash);
	var html = "<table class='tableList '>" +
				"<tbody>" +
				"<tr>" +
				"<th colspan='3'>" +
				"<span class='headerBookTitle'> <a href='#"+bookHash+"_chart'>" + data.title + "[" + data.totalPages + "]</a></span>" +
				"<span class='toRight'>" + data.finishedOn + "</span>" +
				"</th>" +
				"</tr>" +
				"</tbody>" +
				"<tbody>";
	for (var i = 0; i < data.status.length; i++) {
		html += ("<tr " + data.status[i].style + " >");
		html += ("<td class='dateCol'>" + data.status[i].date + "</td>");
		html += ("<td class='pageCol'>" + data.status[i].page + "</td>");
		html += ("<td class='pageCol'>" + data.status[i].delta + "</td>");
		html += "</tr>";
	}
	html += "</tbody>" +
			"</table>";
	il.innerHTML = html;
}