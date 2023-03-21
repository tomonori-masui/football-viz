function makeRanking() {

    // set the dimensions and margins of the graph
    var mobile_width = 620;
    var margin = {top: 20, right: window.innerWidth > mobile_width ? 20 : 40, 
                  bottom: window.innerWidth > mobile_width ? 50 : 70, left: 60},
    width = 800 - margin.left - margin.right,
    height = window.innerWidth > mobile_width ? 480 - margin.top - margin.bottom : 580 - margin.top - margin.bottom;

    // set the ranges
    var team_name_width = 130
    var x = d3.scaleTime().range([0, width-team_name_width]),
    y = d3.scaleLinear().range([0, height]),
    z = d3.scaleOrdinal(d3.schemeTableau10);
    // z = d3.scaleOrdinal(d3.schemeCategory10);

    // define the line
    var valueline = d3.line()
    .curve(d3.curveMonotoneX)
    .x(function(d) { return x(d.Date); })
    .y(function(d) { return y(d.position); });

    var svg = d3.select("#ranking_container").append("svg")
        .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .append("g")
        .attr("id", "plot")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    drawRanking("2022_2023");

    // Add dropdown event
    d3.selectAll(".dropdown_content_li")
    .on("click", function() {
        const season = this.innerText.slice(0, 4) + "_" + this.innerText.slice(5, 9);
        changeSeason(season);
    });

    function changeSeason(season) {
        const season_org = season.slice(0, 4) + "-" + season.slice(5, 9);
        d3.select("#dropbtn_season").html(season_org + ' <i class="fa fa-caret-down"></i>');

        d3.select("#g_line_thin").remove();
        d3.select("#g_line_fat").remove();
        d3.select("#g_team_text").remove();
        d3.select("#g_dots").remove();
        d3.select("#g_rank_text").remove();
        d3.select("#g_pointer").remove();
        d3.select(".xaxis").remove();
        d3.select(".yaxis").remove();
        d3.select(".yaxis_title").remove();

        if (season == "2022_2023") {
            console.log(season);
            d3.select("#updated_date").style("display", "block")
        } else {
            d3.select("#updated_date").style("display", "none")
        }

        drawRanking(season);
    };

    function drawRanking(season) {

        d3.csv("./data/ranks_" + season + ".csv").then(function(ranking_data) {

            d3.csv("./data/matches_" + season + ".csv").then(function(match_data) {

                // format the data
                ranking_data.forEach(function(d) {
                    d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
                    d.rank = parseInt(d.rank);
                    d.position = parseInt(d.position);
                    d.CumPts = parseInt(d.CumPts);
                    d.team_s = d.Team.replace(/\s/g,'');
                });

                match_data.forEach(function(d) {
                    d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
                    d.FTAG = parseInt(d.FTAG);
                    d.FTHG = parseInt(d.FTHG);
                });

                var ranking_data_g = d3.group(ranking_data, d => d.team_s)

                var team_last_rank = {};
                for (const [key, value] of ranking_data_g.entries()) {
                    team_last_rank[key] = value[value.length-1].rank;
                };

                var team_last_position = {};
                for (const [key, value] of ranking_data_g.entries()) {
                    team_last_position[key] = value[value.length-1].position;
                };

                // Scale the range of the data
                x.domain(d3.extent(ranking_data, function(d) { return d.Date; }));
                y.domain([1, d3.max(ranking_data, function(d) { return d.position; })]);
                z.domain(Object.values(team_last_position).sort((a, b) => d3.ascending(a, b)));

                svg.append("g")
                    .attr("id", "g_line_thin")
                    .selectAll("path")
                    .data(ranking_data_g)
                    .join("path")
                    .attr("class", "line_thin")
                    .attr("id", d => "line_" + d[0])
                    .style('stroke', d => team_last_rank[d[0]] <= 5 ? 
                    z(team_last_position[d[0]]) : "LightGray")
                    ;

                svg.append("g")
                    .attr("id", "g_line_fat")
                    .selectAll("path")
                    .data(ranking_data_g)
                    .join("path")
                    .attr("class", "line_fat")
                    .attr("d", (d) => valueline(d[1]));

                svg.append("g")
                    .attr("id", "g_team_text")
                    .selectAll("text")
                    .data(ranking_data_g)
                    .enter()
                    .append("text")
                    .attr("class", "team_text")
                    .attr("dy", "0.35em")
                    .attr("id", function(d) { return "team_text_" + d[0]; })
                    .style('fill', d => team_last_rank[d[0]] <= 5 ? 
                        z(team_last_position[d[0]]) : "DimGray")
                    .text(function(d) { return d[1][0].Team; })
                    .style("opacity", "0")
                    ;

                svg.append("g")
                    .attr("id", "g_dots")
                    .selectAll("circle")
                    .data(ranking_data_g)
                    .enter()
                    .append("circle")
                    .attr("class", "dots")
                    .attr("r", window.innerWidth > mobile_width ? "10" : "12")
                    .attr("cx", width-team_name_width+14)
                    .attr("cy", d => y(team_last_position[d[0]]))
                    .style('fill', d => team_last_rank[d[0]] <= 5 ? 
                    z(team_last_position[d[0]]) : "LightGray")
                    .attr("id", function(d) { return "dot_" + d[0]; })
                    .style("opacity", "0")
                    ;

                svg.append("g")
                    .attr("id", "g_rank_text")
                    .selectAll("text")
                    .data(ranking_data_g)
                    .enter()
                    .append("text")
                    .attr("class", "rank_text")
                    .attr("x", width-team_name_width+14)
                    .attr("y", d => y(team_last_position[d[0]]))
                    .attr("dy", "0.35em")
                    .attr("id", function(d) { return "rank_text_" + d[0]; })
                    .attr("text-anchor", "middle")  
                    .style('fill', "#303030")
                    .text(function(d) { return team_last_rank[d[0]]; })
                    .style("opacity", "0")
                    ;

                svg.append("g")
                    .attr("id", "g_pointer")
                    .append("circle")
                    .attr("id", "pointer")
                    .attr("r", window.innerWidth > mobile_width ? "6" : "10")
                    .style("display", "none")
                    .style("pointer-events","none");

                // Add the x Axis
                svg.append("g")
                    .attr("transform", "translate(0," + height + ")")
                    .attr("class", "xaxis axis")
                    .call(d3.axisBottom(x));

                d3.selectAll(".xaxis")
                .selectAll("text")
                .attr("transform", "translate(-15," + (window.innerWidth > mobile_width ? 17 : 22) + ")rotate(-45)")
                ;

                // Add the y Axis
                svg.append("g")
                    .attr("class", "yaxis axis")
                    .call(d3.axisLeft(y));

                svg.append("text")
                    .attr("class", "yaxis_title")
                    .attr("text-anchor", "middle")  
                    .attr("transform", "translate("+ (- margin.left*0.7) +","+(height/2)+")rotate(-90)")  
                    .text("Rankings");

                // Initial animation
                const t = d3.timer((elapsed) => {
                    d3.selectAll(".line_thin")
                    .style("opacity", function(d) { return team_last_rank[d[0]] <= 5 ? "1" : "0"; })
                    .attr("d", d => valueline(d[1].slice(0, parseInt(elapsed/25))));

                    d3.selectAll(".team_text")
                    .style("opacity", "1")
                    .style("opacity", function(d) { return team_last_rank[d[0]] <= 5 ? "1" : "0"; })
                    .transition()
                    .duration(40)
                    .ease(d3.easeLinear)
                    .attr("transform", function(d) { 
                    len = d[1].length -1 ;
                    cur_idx = parseInt(elapsed/25);

                    const date =  (cur_idx > len) ? d[1][len].Date : d[1][cur_idx].Date;
                    const position =  (cur_idx > len) ? d[1][len].position : d[1][cur_idx].position;   
                    return "translate(" + (x(date)+10) + "," + y(position) + ")"; })
                    ; 

                    const ranking_length = ranking_data.length/20;
                    
                    if (elapsed > 29*ranking_length) {
                        t.stop();

                        d3.selectAll(".line_thin")
                        .transition()
                        .duration(1000)
                        .style("opacity", "1");

                        d3.selectAll(".team_text")
                        .transition()
                        .duration(1000)
                        .style("opacity", "1")
                        .attr("transform", function(d) { 
                        len = d[1].length -1 ;  
                        return "translate(" + (x(d[1][len].Date) + 30) + "," + y(d[1][len].position) + ")"; })
                        ;

                        d3.selectAll(".dots")
                        .transition()
                        .delay(500)
                        .duration(1000)
                        .style("opacity", "1");

                        d3.selectAll(".rank_text")
                        .transition()
                        .delay(500)
                        .duration(1000)
                        .style("opacity", "1");

                        addEvent();
                    }
                }, 30);

                // Event functions
                function mouseLineSelect(thisElem) {

                    d3.selectAll(".line_thin")
                    .style("stroke", "LightGray")
                    .classed("selected", false);
                    d3.selectAll(".team_text").style("fill", "LightGray");
                    d3.selectAll(".dots").style("fill", "LightGray");

                    var team = thisElem.__data__[0];
                    d3.select("#line_" + team)
                    .style('stroke', z(team_last_position[team]))
                    .classed("selected", true)
                    ;

                    d3.select("#team_text_" + team)
                    .style('fill', z(team_last_position[team]));

                    d3.select("#dot_" + team)
                    .style('fill', z(team_last_position[team]));
                };

                function mouseLineUnselect() {

                    d3.selectAll(".line_thin")
                    .classed("selected", false)
                    .style('stroke', d => team_last_rank[d[0]] <= 5 ? 
                    z(team_last_position[d[0]]) : "LightGray");

                    d3.selectAll(".team_text")
                    .style('fill', d => team_last_rank[d[0]] <= 5 ? 
                    z(team_last_position[d[0]]) : "DimGray");

                    d3.selectAll(".dots")
                    .style('fill', d => team_last_rank[d[0]] <= 5 ? 
                    z(team_last_position[d[0]]) : "LightGray");

                    d3.select("#tooltip")
                    .classed("hidden", true);

                    d3.select("#pointer")
                    .style("display", "none");

                    d3.selectAll(".matches")
                    .classed("hidden", true);
                };

                function movePointer(thisElem, event) {

                    var team = thisElem.__data__[0];
                    pos = d3.pointer(event);

                    var array = thisElem.__data__[1];
                    const data_of_date = d3.least(array, d => Math.abs(x(d.Date) - pos[0]));

                    d3.select("#pointer")
                    .style("display", null)
                    .style('fill', z(team_last_position[team]))
                    .attr("cx", x(data_of_date.Date))
                    .attr("cy", y(data_of_date.position));

                    const rect = document.getElementById('g_line_fat').getBoundingClientRect();

                    if (window.innerWidth > 500){
                        if (event.pageX - 120 > 0){
                            var left_pos = event.pageX - 120;
                        } else {
                            var left_pos = event.pageX + 40;
                        };
                        if (event.pageY - 90 > 0){
                            var top_pos = event.pageY - 90;
                        } else {
                            var top_pos = event.pageY + 60;
                        }
                    } else {
                        if (event.pageX - 100 > 0){
                            var left_pos = event.pageX - 100
                        } else {
                            var left_pos = event.pageX + 10
                        }
                        if (event.pageY - 70 > 0){
                            var top_pos = event.pageY - 70;
                        } else {
                            var top_pos = event.pageY + 40;
                        }
                    }

                    d3.select("#tooltip")
                    .classed("hidden", false)
                    .style("left", left_pos + "px")
                    .style("top", top_pos + "px")
                    .select("#ttp_1")
                    .html(thisElem.__data__[1][0]['Team']);

                    const formatTime = d3.timeFormat("%b %d");
                    const date = formatTime(data_of_date.Date);

                    const rank_suffix = data_of_date.rank == 1 ? "st" : 
                                        data_of_date.rank == 2 ? "nd" :
                                        data_of_date.rank == 3 ? "rd" :
                                        "th";
                    d3.select("#tooltip")
                    .select("#ttp_2")
                    .html(data_of_date.rank + "<span>" + rank_suffix + " | " 
                    + data_of_date.CumPts + " Pts | " + date + "</span>");

                    updateMatches(thisElem, data_of_date, match_data, z, team_last_position);

                };


                function addEvent() {

                    d3.selectAll(".line_fat")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { mouseLineSelect(this) ;})
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    .on("mousemove",  function(event, d) { movePointer(this, event) ;})
                    ;

                    d3.selectAll(".team_text")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { 
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".dots")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { 
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".rank_text")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) {
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                };

                // Touch screen device needs additional event listener to unselect objects
                function touchUnselect(event) {
                    var noRedirect = '.line_fat, .team_text, .dots, .rank_text';
                    if (!event.target.matches(noRedirect)) {
                        mouseLineUnselect();
                    }
                };
                document.body.addEventListener('touchstart', touchUnselect); 

            });

        });
    };

};

function updateMatches(thisElem, data_of_date, match_data, z, team_last_position) {

    const team = thisElem.__data__[0];
    const team_org = thisElem.__data__[1][0]['Team'];
    var match_filtered = match_data.filter(d => d.HomeTeam == team_org || d.AwayTeam == team_org);

    const closest = d3.least(match_filtered, d => Math.abs(d.Date - data_of_date.Date));

    const index = match_filtered.findIndex(object => {
        return object.Date == closest.Date;
    });
    const len = match_filtered.length;

    if (index - 5 >= 0 && index + 6 <= len){
        var start = index - 5;
        var end = index + 6;
    } else if (index + 6 > len) {
        var start = len >= 11 ? len - 11 : 0;
        var end = len;
    } else {
        var start = 0;
        var end = len >= 11 ? 11 : len;
    }
    match_filtered = match_filtered.slice(start, end);

    d3.selectAll(".matches")
    .classed("hidden", false);

    d3.select("#matches_header").html(team_org.slice(-1) == "s" ? team_org + "' Matches" : team_org + "'s Matches");

    var i = 1;
    const formatTime = d3.timeFormat("%b %d");
    for (const m of match_filtered){
        var m_date = formatTime(m.Date);
        match = d3.select("#match_" + i);

        match.select(".matches_date").html(m_date);
        
        var span_color = "<span style='color:" + z(team_last_position[team]) + "'>";
        var home_team = m.HomeTeam == team_org ? span_color + m.HomeTeam + "</span>" : m.HomeTeam;
        var away_team = m.AwayTeam == team_org ? span_color + m.AwayTeam + "</span>" : m.AwayTeam;
        var home_score = m.FTHG > m.FTAG ? 
            "<span style='font-weight: bold;'>" + m.FTHG + "</span>" : m.FTHG;
        var away_score = m.FTHG < m.FTAG ? 
            "<span style='font-weight: bold;'>" + m.FTAG + "</span>" : m.FTAG;
        if (m.HomeTeam == team_org){
            var result = m.FTHG > m.FTAG ? "W" : m.FTHG < m.FTAG ? "L" : "D";
        } else {
            var result = m.FTHG < m.FTAG ? "W" : m.FTHG > m.FTAG ? "L" : "D";
        };

        match.select(".matches_result")
             .style("color", result == "W" ? "forestgreen" : result == "L" ? "crimson" : "slategray")
             .html(result);
        match.select(".matches_home").html(home_team + " &nbsp " + home_score);
        match.select(".matches_away").html(away_score + " &nbsp " + away_team);

        if (closest.Date == m.Date) {
            match.style("background-color", "seashell");
        } else {
            match.style("background-color", "transparent");
        };

        i += 1;
    };
};