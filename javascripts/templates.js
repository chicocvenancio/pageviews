const templates = {
  linearLegend: "<b>Totals:</b> <% var total = chartData.reduce(function(a,b){ return a + b.sum }, 0); %>" +
    "<ul class=\"<%=name.toLowerCase()%>-legend\">" +
    "<%if(chartData.length > 1) {%><li><%= pv.n(total) %> (<%= pv.n(Math.round(total / numDaysInRange())) %>/day)</li><% } %>" +
    "<% for (var i=0; i<datasets.length; i++){%>" +
    "<li><span class=\"indic\" style=\"background-color:<%=datasets[i].strokeColor%>\">" +
    "<a href='<%= pv.getPageURL(datasets[i].label) %>'><%=datasets[i].label%></a></span> " +
    "<%= pv.n(chartData[i].sum) %> (<%= pv.n(Math.round(chartData[i].sum / numDaysInRange())) %>/day)</li><%}%></ul>",
  circularLegend: "<b>Totals:</b> <% var total = chartData.reduce(function(a,b){ return a + b.value }, 0); %>" +
    "<ul class=\"<%=name.toLowerCase()%>-legend\">" +
    "<%if(chartData.length > 1) {%><li><%= pv.n(total) %> (<%= pv.n(Math.round(total / numDaysInRange())) %>/day)</li><% } %>" +
    "<% for (var i=0; i<segments.length; i++){%>" +
    "<li><span class=\"indic\" style=\"background-color:<%=segments[i].fillColor%>\">" +
    "<a href='<%= pv.getPageURL(segments[i].label) %>'><%=segments[i].label%></a></span> " +
    "<%= pv.n(chartData[i].value) %> (<%= pv.n(Math.round(chartData[i].value / numDaysInRange())) %>/day)</li><%}%></ul>"
};

module.exports = templates;
