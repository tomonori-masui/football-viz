import { bringToFront } from './utils.js';

export function makeRanking(latest_season) {

    // set the dimensions and margins of the graph
    var mobile_width = 620;
    var margin = {top: 18, right: window.innerWidth > mobile_width ? 20 : 40, 
                  bottom: window.innerWidth > mobile_width ? 50 : 80, left: 60},
    width = 800 - margin.left - margin.right,
    height = (window.innerWidth > mobile_width ? 430 - margin.top - margin.bottom 
        : 1000 - margin.top - margin.bottom
    );

    // set the ranges
    var team_name_width = window.innerWidth > mobile_width ? 130 : 200
    var x = d3.scaleTime().range([0, width-team_name_width]),
    y = d3.scaleLinear().range([0, height]),
    z = d3.scaleOrdinal(d3.schemeTableau10);
    // z = d3.scaleOrdinal(d3.schemeCategory10);

    const formatDate = d3.timeFormat("%y-%m-%d")

    // define the line
    var valueline = d3.line()
    .curve(d3.curveMonotoneX)
    .x(function(d) { return x(d.Date); })
    .y(function(d) { return y(d.position); });

    var svg = d3.select("#ranking_container").append("svg")
        .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) 
            + " " + (height + margin.top + margin.bottom))
        .append("g")
        .attr("id", "plot")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    drawRanking(latest_season);

    // Add dropdown event
    d3.selectAll(".dropdown_content_li")
    .on("click", function() {
        const season = this.innerText.slice(0, 4) + "_" + this.innerText.slice(5, 9);
        changeSeason(season, latest_season);
    });

    function changeSeason(season, latest_season) {
        const season_org = season.slice(0, 4) + "-" + season.slice(5, 9);
        d3.select("#dropbtn_season").html('<span class="left">' + season_org + '</span>' 
            + ' <i class="fa fa-caret-down right"></i>');

        d3.select("#g_line_thin").remove();
        d3.select("#g_line_fat").remove();
        d3.select("#g_team_text").remove();
        d3.select("#g_dots").remove();
        d3.select("#g_rank_text").remove();
        d3.select("#g_pointer").remove();
        d3.selectAll(".g_match_dots").remove();
        d3.selectAll(".g_match_dots_fat").remove();
        d3.select(".xaxis").remove();
        d3.select(".yaxis").remove();
        d3.select(".yaxis_title").remove();

        if (season == latest_season) {
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
                    d.AwayTeamCumPts = parseInt(d.AwayTeamCumPts);
                    d.AwayTeamRank = parseInt(d.AwayTeamRank);
                    d.AwayTeamPosition = parseInt(d.AwayTeamPosition);
                    d.HomeTeamCumPts = parseInt(d.HomeTeamCumPts);
                    d.HomeTeamRank = parseInt(d.HomeTeamRank);
                    d.HomeTeamPosition = parseInt(d.HomeTeamPosition);
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
                    .attr("r", window.innerWidth > mobile_width ? "8" : "16")
                    .attr("cx", d => {
                        let dx = window.innerWidth > mobile_width ? 14 : 26;
                        return width-team_name_width+dx
                    })
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
                    .attr("x", d => {
                        let dx = window.innerWidth > mobile_width ? 14 : 26;
                        return width-team_name_width+dx
                    })
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
                .attr("transform", "translate(-15," + (window.innerWidth > mobile_width ? 17 : 30) + ")rotate(-45)")
                ;

                // Add the y Axis
                svg.append("g")
                    .attr("class", "yaxis axis")
                    .call(d3.axisLeft(y));

                svg.append("text")
                    .attr("class", "yaxis_title")
                    .attr("text-anchor", "middle")  
                    .attr("transform", "translate("+ (- margin.left*0.7) +","+(height/2)+")rotate(-90)")  
                    .text("Standings");

                // draw match dots
                for (const [key, value] of ranking_data_g.entries()) {
                    let team = value[0].Team;
                    let match_filtered = structuredClone(match_data.filter(
                        d => d.HomeTeam == team || d.AwayTeam == team
                    ));
                
                    for (const m of match_filtered){
                        m.team_s = key;
                        m.team = team; 
                        m.rank = m.HomeTeam == team ? m.HomeTeamRank : m.AwayTeamRank;
                        m.position = m.HomeTeam == team ? m.HomeTeamPosition : m.AwayTeamPosition;
                        m.TeamCumPts = m.HomeTeam == team ? m.HomeTeamCumPts : m.AwayTeamCumPts;
                        if (m.FTHG == m.FTAG){
                            m.resultColor = "#b2babb";
                            m.resultColorToolTip = "#616a6b";
                        } else if ((m.HomeTeam == team && m.FTHG > m.FTAG) || (m.AwayTeam == team && m.FTHG < m.FTAG)){
                            m.resultColor = "#7dcea0";
                            m.resultColorToolTip = "#1e8449";
                        } else {
                            m.resultColor = "#ec7063";
                            m.resultColorToolTip = "#e74c3c";
                        }
                    };

                    svg.append("g")
                    .attr("id", "g_match_dots_" + key)
                    .attr("class", "g_match_dots")
                    .selectAll("circle")
                    .data(match_filtered)
                    .enter()
                    .append("circle")
                    .attr("id", d => "match_dots_" + key + "_" + formatDate(d.Date))
                    .attr("class", "match_dots match_dots_" + key)
                    .attr("r", window.innerWidth > mobile_width ? "3.5" : "6.5")
                    .attr("cx", d => x(d.Date))
                    .attr("cy", d => y(d.position))
                    .style('fill', d => d.resultColor)
                    .style('stroke', d => z(team_last_position[d.team_s]))
                    .style("stroke-width", window.innerWidth > mobile_width ? "1.5" : "3")
                    .style("display", "none")
                    ;

                    svg.append("g")
                    .attr("id", "g_match_dots_fat_" + key)
                    .attr("class", "g_match_dots_fat")
                    .selectAll("circle")
                    .data(match_filtered)
                    .enter()
                    .append("circle")
                    .attr("class", "match_dots_fat match_dots_fat_" + key)
                    .attr("r", window.innerWidth > mobile_width ? "10" : "14")
                    .attr("cx", d => x(d.Date))
                    .attr("cy", d => y(d.position))
                    .style('fill', d => d.resultColor)
                    .style("opacity", "0")
                    ;
                };

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
                    let len = d[1].length -1 ;
                    let cur_idx = parseInt(elapsed/25);

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
                        let len = d[1].length -1 ;
                        let offset = window.innerWidth > mobile_width ? 30 : 48;
                        return "translate(" + (x(d[1][len].Date) + offset) + "," + y(d[1][len].position) + ")"; })
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
                    var team = thisElem.__data__[0];
                    lineSelect(team);
                };

                function lineSelect(team) {

                    d3.selectAll(".line_thin")
                    .style("stroke", "LightGray")
                    .classed("selected", false);
                    d3.selectAll(".team_text").style("fill", "LightGray");
                    d3.selectAll(".dots").style("fill", "LightGray");

                    d3.select("#line_" + team)
                    .style('stroke', z(team_last_position[team]))
                    .classed("selected", true)
                    .call(bringToFront)
                    ;

                    d3.select("#team_text_" + team)
                    .style('fill', z(team_last_position[team]));

                    d3.select("#dot_" + team)
                    .style('fill', z(team_last_position[team]));

                    d3.selectAll(".match_dots_" + team)
                    .style("display", null)
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

                    d3.select("#pointer")
                    .style("display", "none");

                    d3.selectAll(".matches")
                    .classed("hidden", true);

                    d3.selectAll(".match_dots")
                    .attr("r", window.innerWidth > mobile_width ? "3.5" : "6.5")
                    .style("stroke-width", window.innerWidth > mobile_width ? "1.5" : "3")
                    .style("display", "none")
                };

                function mouseMatchDotsSelect(thisElem, event){

                    d3.select("#match_dots_" + thisElem.__data__.team_s 
                        + "_" + formatDate(thisElem.__data__.Date))
                    .attr('r', window.innerWidth > mobile_width ? "6" : "11")
                    .style("stroke-width", window.innerWidth > mobile_width ? "3" : "6")
                    ;

                    lineSelect(thisElem.__data__.team_s);

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

                    let resultText;
                    if (thisElem.__data__.HomeTeam == thisElem.__data__.team){
                        resultText = thisElem.__data__['HomeTeam'] + " " + thisElem.__data__['FTHG']
                        + " - <span>"
                        + thisElem.__data__['FTAG'] + " " + thisElem.__data__['AwayTeam'] + "</span>"
                    } else {
                        resultText = "<span>" + thisElem.__data__['HomeTeam'] + " " + thisElem.__data__['FTHG']
                        + "</span> - "
                        + thisElem.__data__['FTAG'] + " " + thisElem.__data__['AwayTeam']
                    };

                    d3.select("#tooltip_f1")
                    .classed("hidden", false)
                    .style("left", left_pos + "px")
                    .style("top", top_pos + "px")
                    .style("background-color", thisElem.__data__.resultColorToolTip)
                    .select(".ttp_1")
                    .html(resultText);

                    const formatTime = d3.timeFormat("%b %d");
                    const date = formatTime(thisElem.__data__.Date);

                    const rank_suffix = thisElem.__data__.rank == 1 ? "st" : 
                                        thisElem.__data__.rank == 2 ? "nd" :
                                        thisElem.__data__.rank == 3 ? "rd" :
                                        "th";
                    d3.select("#tooltip_f1")
                    .select(".ttp_2")
                    .html("<span>" + date + " | " + thisElem.__data__.TeamCumPts + " Pts | " + "</span>"
                        + thisElem.__data__.rank + "<span>" + rank_suffix + "</span>"
                    );
                }

                function mouseMatchDotsUnselect() {
                    d3.select("#tooltip_f1")
                    .classed("hidden", true);

                    d3.selectAll(".match_dots")
                    .attr("r", window.innerWidth > mobile_width ? "3.5" : "6.5")
                    .style("stroke-width", window.innerWidth > mobile_width ? "1.5" : "3")
                    .style("display", "none")
                }

                function addEvent() {

                    d3.selectAll(".line_fat")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { mouseLineSelect(this) ;})
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".team_text")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { 
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip_f1").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".dots")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) { 
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip_f1").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".rank_text")
                    .on("mouseover", function(event, d) { mouseLineSelect(this) ;})
                    .on("click", function(event, d) {
                        mouseLineSelect(this);
                        d3.select("#pointer").style("display", "none");
                        d3.select("#tooltip_f1").classed("hidden", true);
                    })
                    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
                    ;

                    d3.selectAll(".match_dots_fat")
                    .on("mouseover", function(event, d) { mouseMatchDotsSelect(this, event) ;})
                    .on("click", function(event, d) { mouseMatchDotsSelect(this, event) ;})
                    .on("mouseout", function(event, d) {
                        mouseMatchDotsUnselect();
                        mouseLineUnselect();
                    })
                    ;

                };

                // Touch screen device needs additional event listener to unselect objects
                function touchUnselect(event) {
                    var noRedirect = '.line_fat, .team_text, .dots, .rank_text .match_dots_fat';
                    if (!event.target.matches(noRedirect)) {
                        mouseLineUnselect();
                    }
                };
                document.body.addEventListener('touchstart', touchUnselect); 

            });

        });
    };

};