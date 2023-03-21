function makeTeamsCharts() {

    // Add dropdown event
    d3.select("#dropdown_content_season")
    .selectAll("li")
    .on("click", function() {
        const season = this.innerText.slice(0, 4) + "_" + this.innerText.slice(5, 9);
        changeSeason(season);
    });

    // Touch screen device needs additional event listener to unselect objects
    function touchUnselect(event) {
        var noRedirect = '.barGF, .barGA, .polygon-areas';
        if (!event.target.matches(noRedirect)) {
            mouseBarUnselect();
            mouseRadarUnSelect();
        }
    };
    document.body.addEventListener('touchstart', touchUnselect);

    // hide dropdown when the other dropdown is clicked
    d3.select("#dropbtn_season")
    .on("click", function() { 
        d3.select("#dropdown_content_team").classed('show', false)
    });
    d3.select("#dropbtn_team")
    .on("click", function() { 
        d3.select("#dropdown_content_season").classed('show', false)
    });

    drawTeams("2022_2023");
};

function drawTeams(season) {

    d3.csv("./data/matches_" + season + ".csv").then(function(data_matches) {

        // format the data
        data_matches.forEach(function(d) {
            d.Date = d3.timeParse("%Y-%m-%d")(d.Date);
            d.FTHG = parseInt(d.FTHG);
            d.FTAG = parseInt(d.FTAG);
        });

        // Create team names array
        var rawTeamValues = data_matches.map(function(d){ return d.HomeTeam});
        var uniqueTeams = [...new Set(rawTeamValues)].sort();
        var startingTeam = uniqueTeams[0];

        d3.select("#dropdown_content_team")
        .selectAll("li")
        .data(uniqueTeams)
        .enter()
        .append("li")
        .attr("class", "dropdown_content_li")
        .attr("id", function(d) { return "dropdown_" + d.replace(/\s/g, '')})
        .html(function(d){return d})
        ;

        d3.select("#dropbtn_team").html(startingTeam + ' <i class="fa fa-caret-down"></i>');
        d3.select("#scores_title").html(startingTeam + "'s Match Results");
        drawBars(data_matches, startingTeam);

        d3.csv("./data/team_stats_" + season + ".csv").then(function(data_stats) {

            // format the data
            data_stats.forEach(function(d) {
                d.value = parseFloat(d.value);
                d.value_org = parseFloat(d.value_org);
            });

            d3.select("#dropdown_content_team")
            .selectAll("li")
            .on("click", function() { 
                changeTeam(data_matches, data_stats, this.__data__)
            })
    
            // Add dropdown list
            d3.select("#dropdown_content_vsteam")
            .selectAll("li")
            .data(uniqueTeams)
            .enter()
            .append("li")
            .attr("class", "dropdown_content_li")
            .attr("id", function(d) { return "dropdown_vs_" + d.replace(/\s/g, '')})
            .html(function(d){return "vs. " + d})
            .on("click", function() { changeVsTeam(data_stats, this.__data__);})
            ;
    
            render(data_stats, startingTeam, null); // render the visualization
        });

    });
};

function changeSeason(season) {
    const season_org = season.slice(0, 4) + "-" + season.slice(5, 9);
    d3.select("#dropbtn_season").html(season_org + ' <i class="fa fa-caret-down"></i>');
    d3.select("#dropbtn_vsteam").html('Team to be compared <i class="fa fa-caret-down"></i>');

    d3.select("#dropdown_content_team").selectAll("li").remove();
    d3.select("#dropdown_content_vsteam").selectAll("li").remove();

    if (season == "2022_2023") {
        console.log(season);
        d3.select("#updated_date").style("display", "block")
    } else {
        d3.select("#updated_date").style("display", "none")
    }
    
    drawTeams(season);
};

//////// Bar chart
// set the dimensions and margins of the graph
var ipad_width = 810 + 20;
var mobile_width = 620;
var margin = {
    top: 20, right: 20, 
    bottom: window.innerWidth > ipad_width ? 127 : ( window.innerWidth > mobile_width ? 160 : 190 ), 
    left: 70
};
var width = 960 - margin.left - margin.right;
var height = window.innerWidth > ipad_width ? 400 - margin.top - margin.bottom : 
    ( window.innerWidth > mobile_width ? 500 - margin.top - margin.bottom : 550 - margin.top - margin.bottom);

// set the ranges
var xScale = d3.scaleBand().range([0, width]).padding(0.25);
var yScale1 = d3.scaleLinear().range([height/2, 0]);
var yScale2 = d3.scaleLinear().range([height/2, height]);;

function drawBars(data, team){

    if (document.getElementById("plot") == null){

        d3.select("#bars_container").append("svg")
        .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
        .append("g")
        .attr("id", "plot")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
    }

    var svg = d3.select("#plot");

    yScale1.domain([0, d3.max(data, function(d) { return Math.max(d.FTHG, d.FTAG); })]);
    yScale2.domain([0, d3.max(data, function(d) { return Math.max(d.FTHG, d.FTAG); })]);

    d3.select("#dropbtn_team").html(team + " <i class='fa fa-caret-down'></i>");

    d3.select("#xaxis").remove();
    d3.select("#xaxis2_1").remove();
    d3.select("#xaxis2_2").remove();
    d3.select("#yaxis1").remove();
    d3.select("#yaxis2").remove();
    d3.select("#barsGF").remove();
    d3.select("#barsGA").remove();

    var match_filtered = data.filter(d => d.HomeTeam == team || d.AwayTeam == team);
    match_filtered = match_filtered.sort((a, b) => d3.ascending(a.Date, b.Date));

    const formatTime = d3.timeFormat("%b %d");

    match_filtered.forEach(function(d) {
        d.date_team = d.HomeTeam != team ? 
            formatTime(d.Date) + " / " + d.HomeTeam: 
            formatTime(d.Date) + " / " + d.AwayTeam;
        d.GF = d.HomeTeam == team ? d.FTHG : d.FTAG;
        d.GA = d.HomeTeam != team ? d.FTHG : d.FTAG;
    });

    xScale.domain(match_filtered.map(function(d) { return d.date_team; }));

    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .attr("id", "xaxis")
    .attr("class", "axis")
    .call(d3.axisBottom(xScale));

    // remove labels on xaxis
    d3.select("#xaxis")
    .selectAll("text")
    .remove()
    ;

    svg.append("g")
    .attr("id", "yaxis1")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale1).ticks(5));

    svg.append("g")
    .attr("id", "yaxis2")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale2).ticks(5));

    const match_length = match_filtered.length;
    const w = width / match_length * (0.971 + 0.026*match_length/38); // heuristic logic to match the location
    const formatDate = d3.timeFormat("%b%d");

    // add bottom aligned date labels on xaxis
    svg.append("g")
    .attr("id", "xaxis2_1")
    .attr("class", "axis")
    .selectAll("text")
    .data(match_filtered)
    .enter()
    .append("text")
    .attr("y", function(d,i){ return w*i+w*(0.55+0.25*match_length/38)}) // heuristic logic to match the location
    .attr("x", window.innerWidth > ipad_width ? -height-125 : ( window.innerWidth > mobile_width ? -height-160 : -height-190))
    .attr("transform", "rotate(-90)")
    .transition()
    .delay(function(d,i){ return i * 20})
    .text(d => formatTime(d.Date))
    ;

    // add bottom aligned team labels on xaxis
    svg.append("g")
    .attr("id", "xaxis2_2")
    .attr("class", "axis")
    .selectAll("text")
    .data(match_filtered)
    .enter()
    .append("text")
    .attr("y", function(d,i){ return w*i+w*(0.55+0.25*match_length/38)}) // heuristic logic to match the location
    .attr("x", window.innerWidth > ipad_width ? -height-85 : ( window.innerWidth > mobile_width ? -height-100 : -height-123))
    .attr("transform", "rotate(-90)")
    .transition()
    .delay(function(d,i){ return i * 20})
    .text(d => d.HomeTeam != team ? d.HomeTeam : d.AwayTeam)
    ;

    // Title on Y axis
    if (document.getElementById('yaxis_title1') == null) {

        svg.append("text")
            .attr("id", "yaxis_title1")
            .attr("class", "axis_title")
            .attr("text-anchor", "middle")  
            .attr("transform", "translate("+ (- margin.left*0.5) +","+(height*0.25)+")rotate(-90)")  
            .text("Goals For");

        svg.append("text")
            .attr("id", "yaxis_title2")
            .attr("class", "axis_title")
            .attr("text-anchor", "middle")  
            .attr("transform", "translate("+ (- margin.left*0.5) +","+(height*0.75)+")rotate(-90)")  
            .text("Goals Against");
    };

    svg.append("g")
    .attr("id", "barsGF")
    .selectAll("rect")
    .data(match_filtered)
    .enter()
    .append("rect")
    .attr("class", "barGF")
    .attr("id", function(d) { return "barGF_" + formatDate(d.Date); })
    .attr("x", function(d) { return xScale(d.date_team); })
    .attr("width", xScale.bandwidth())
    .attr("fill", "#7DCEA0")
    .on("mouseover", function(event, d) { mouseBarSelect(this, event) ;})
    .on("click", function(event, d) { mouseBarSelect(this, event) ;})
    .on("mouseout", function(event, d) { mouseBarUnselect() ;})
    .on("mousemove",  function(event, d) { movePointer(this, event) ;})
    .attr("y", function(d) {return yScale1(0);}) // setting this to make the bars grow from the bottom
    .attr("height", 0)
    .transition()
    .delay(function(d,i){ return i * 20})
    .duration(500)
    .attr("y", function(d) { return yScale1(d.GF == 0 && d.GA == 0 ? 0.05 : d.GF); })
    .attr("height", function(d) { return height/2 - yScale1(d.GF == 0 && d.GA == 0 ? 0.05 : d.GF); })
    ;

    svg.append("g")
    .attr("id", "barsGA")
    .selectAll("rect")
    .data(match_filtered)
    .enter()
    .append("rect")
    .attr("class", "barGA")
    .attr("id", function(d) { return "barGA_" + formatDate(d.Date); })
    .attr("x", function(d) { return xScale(d.date_team); })
    .attr("y", function(d) { return height/2; })
    .attr("width", xScale.bandwidth())
    .attr("fill", "#F1948A")
    .on("mouseover", function(event, d) { mouseBarSelect(this, event) ;})
    .on("click", function(event, d) { mouseBarSelect(this, event) ;})
    .on("mouseout", function(event, d) { mouseBarUnselect() ;})
    .on("mousemove",  function(event, d) { movePointer(this, event) ;})
    .transition()
    .delay(function(d,i){ return i * 20})
    .duration(500)
    .attr("height", function(d) { return height/2 - yScale1(d.GF == 0 && d.GA == 0 ? 0.05 : d.GA); })
    ;

    function mouseBarSelect(thisElem, event) {

        d3.selectAll(".barGF")
        .attr('stroke', "none")
        .attr('stroke-width', "0")
        .style("fill", "#7DCEA0");

        d3.selectAll(".barGA")
        .attr('stroke', "none")
        .attr('stroke-width', "0")
        .style("fill", "#F1948A");

        var date = formatDate(thisElem.__data__.Date);

        d3.select("#barGF_" + date)
        .attr('stroke', "#229954")
        .attr('stroke-width', "5")
        .style('fill', "#27AE60");

        d3.select("#barGA_" + date)
        .attr('stroke', "#CB4335")
        .attr('stroke-width', "5")
        .style('fill', "#E74C3C");
    };

    function movePointer(thisElem, event) {

        var HA = thisElem.__data__.HomeTeam == team ? "Home" : "Away";
        var vsTeam = HA == "Home" ? 
                    thisElem.__data__.AwayTeam : 
                    thisElem.__data__.HomeTeam;
        var scores = HA == "Home" ? 
                    thisElem.__data__.FTHG + " - " + thisElem.__data__.FTAG: 
                    thisElem.__data__.FTAG + " - " + thisElem.__data__.FTHG;

        if (window.innerWidth > 600){
            if (event.pageX - 120 > 0){
                var left_pos = event.pageX - 120;
            } else {
                var left_pos = event.pageX + 40;
            };
            if (event.pageY - 80 > 0){
                var top_pos = event.pageY - 80;
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

        d3.select("#tooltip_bars")
        .classed("hidden", false)
        .style("left", left_pos + "px")
        .style("top", top_pos + "px")
        .select("#ttp_1")
        .html(scores + " " + vsTeam);

        d3.select("#tooltip_bars")
        .select("#ttp_2")
        .html("<span>" + formatTime(thisElem.__data__.Date) + " | " + HA + "</span>");

        RadarTooltipHide()
    };
};

function mouseBarUnselect() {

    d3.selectAll(".barGF")
    .attr('stroke', "none")
    .attr('stroke-width', "0")
    .style("fill", "#7DCEA0");

    d3.selectAll(".barGA")
    .attr('stroke', "none")
    .attr('stroke-width', "0")
    .style("fill", "#F1948A");

    d3.select("#tooltip_bars")
    .classed("hidden", true);
};

//////////////// Radar
// initiate default config
var w = 300;
var h = 300;

var config = {
    w: w,
    h: h,
    levels: 4,
    maxValue: 80,
    radians: 2 * Math.PI,
    polygonAreaOpacity: 0.3,
    polygonStrokeOpacity: 1,
    polygonPointSize: 4,
    legendBoxSize: 12,
    translateX: w / 3,
    translateY: h / 4,
    paddingX: w * 0.7,
    paddingY: h * 0.85,
    colors: d3.scaleOrdinal(d3.schemeTableau10),
    showLevels: true,
    showLevelsLabels: false,
    showAxesLabels: true,
    showAxes: true,
    showLegend: true,
    showVertices: true,
    showPolygons: true
};

// initiate main vis component
var vis = {
    svg: null,
    tooltip: null,
    levels: null,
    axis: null,
    vertices: null,
    legend: null,
    allAxis: null,
    total: null,
    radius: null
};

function changeTeam(data_matches, data_stats, team) {

    d3.select("#scores_title").html(team.slice(-1) == "s" ? team + "' Match Results" : team + "'s Match Results");
    d3.select("#dropbtn_team").html(team + ' <i class="fa fa-caret-down"></i>');
    d3.select("#dropbtn_vsteam").html('Team to be compared <i class="fa fa-caret-down"></i>');
    drawBars(data_matches, team);
    render(data_stats, team, null);
}

function changeVsTeam(data, vsteam) {
    d3.select("#dropbtn_vsteam").html("vs. " + vsteam + ' <i class="fa fa-caret-down"></i>');
    const team = document.getElementById("dropbtn_team").innerText.trim()
    render(data, team, vsteam);
}

// render the visualization
function render(data, team, vsteam) {

    if ( vsteam == null ) {
        data_filtered = data.filter(d => d.Team == 'League Average' || d.Team == team);
    } else {
        data_filtered = data.filter(d => d.Team == 'League Average' || d.Team == team || d.Team == vsteam);
    };

    data_grouped = d3.group(data_filtered, d => d.Team);

    // remove existing svg if exists
    d3.select('#radar_container').selectAll("svg").remove();
    
    buildVis(data_grouped); // build svg
    changeTeamText(team)
}

function changeTeamText(team) {

    if (document.getElementById('team_text') == null) {

        d3.select("#team_name_container")
        .append("svg")
        .attr("viewBox", "0 0 500 300")
        .append("g")
        .append("text")
        .attr("id", "team_text")
        .attr("y", 230)
        .attr("x", 250)
        .attr("text-anchor", "middle")  
        .attr("alignment-baseline", "middle")
        .style("fill", "#E5E7E9")
        .style("font-weight", "bold")
        ;
    };

    const fontSize = 700 / team.length;
    d3.select("#team_text")
    .style('font-size', fontSize + 'px')
    .text(team)
}


//build visualization using the other build helper functions
function buildVis(data) {
    buildVisComponents(data);
    buildCoordinates(data);
    if (config.showLevels) buildLevels();
    if (config.showLevelsLabels) buildLevelsLabels();
    if (config.showAxes) buildAxes();
    if (config.showAxesLabels) buildAxesLabels();
    if (config.showLegend) buildLegend(data);
    if (config.showVertices) buildVertices(data);
    if (config.showPolygons) buildPolygons(data);
}


// build main vis components
function buildVisComponents(data) {
    // update vis parameters
    vis.allAxis = Array.from(data)[0][1].map(d => d.variable);
    vis.totalAxes = vis.allAxis.length;
    vis.radius = Math.min(config.w / 2, config.h / 2);

    // create main vis svg
    vis.svg = d3.select('#radar_container')
        .append("svg").classed("svg-vis", true)
        .attr("viewBox", "0 0 " +  (config.w + config.paddingX) + " " + (config.h + config.paddingY))
        .append("svg:g")
        .attr("id", "plot")
        .attr("transform", "translate(" + config.translateX + "," + config.translateY + ")");

    // create levels
    vis.levels = vis.svg.append("svg:g").classed("levels", true);

    // create axes
    vis.axes = vis.svg.append("svg:g").classed("axes", true);

    // create vertices
    vis.vertices = vis.svg.append("svg:g").classed("vertices", true);

    //Initiate Legend	
    vis.legend = vis.svg.append("svg:g").classed("legend", true)
        .attr("height", config.h / 2)
        .attr("width", config.w / 2)
        .attr("transform", "translate(" + 0.15 * config.w + ", " + (-0.2 * config.h) + ")")
        ;
}


function buildCoordinates(data) {
    data.forEach(function(group) {
        group.forEach(function(d, i) {
            d.coordinates = { // [x, y] coordinates
                x: config.w / 2 * (1 - (parseFloat(Math.max(d.value, 0)) / config.maxValue) 
                    * Math.sin(i * config.radians / vis.totalAxes)),
                y: config.h / 2 * (1 - (parseFloat(Math.max(d.value, 0)) / config.maxValue) 
                    * Math.cos(i * config.radians / vis.totalAxes))
            };
        });
    });
}


// builds out the levels of the spiderweb
function buildLevels() {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-lines
        vis.levels
        .append("g")
        .classed("levels-line", true)
        .selectAll('line')
        .data(vis.allAxis)
        .enter()
        .append("svg:line")
        .classed("level-lines", true)
        .attr("x1", function(d, i) { return levelFactor * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y1", function(d, i) { return levelFactor * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
        .attr("x2", function(d, i) { return levelFactor * (1 - Math.sin((i + 1) * config.radians / vis.totalAxes)); })
        .attr("y2", function(d, i) { return levelFactor * (1 - Math.cos((i + 1) * config.radians / vis.totalAxes)); })
        .attr("transform", "translate(" + (config.w / 2 - levelFactor) + ", " + (config.h / 2 - levelFactor) + ")")
        .attr("stroke", "gray")
        .attr("stroke-width", "0.5px");
    }
}


// builds out the levels labels
function buildLevelsLabels() {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-labels
        vis.levels
        .append("g")
        .classed("levels-label", true)
        .selectAll('text')
        .data([1]).enter()
        .append("svg:text").classed("level-labels", true)
        .text((config.maxValue * (level + 1) / config.levels).toFixed(1))
        .attr("x", function(d) { return levelFactor * (1 - Math.sin(0)); })
        .attr("y", function(d) { return levelFactor * (1 - Math.cos(0)); })
        .attr("transform", "translate(" + (config.w / 2 - levelFactor + 5) + ", " + (config.h / 2 - levelFactor) + ")")
        .attr("fill", "gray")
        .attr("font-family", "sans-serif")
        .attr("font-size", 11 + "px");
    }
}


// builds out the axes
function buildAxes() {

    vis.axes
    .append("g")
    .classed("axis-line", true)
    .selectAll("line")
    .data(vis.allAxis).enter()
    .append("svg:line").classed("axis-lines", true)
    .attr("x1", config.w / 2)
    .attr("y1", config.h / 2)
    .attr("x2", function(d, i) { return config.w / 2 * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
    .attr("y2", function(d, i) { return config.h / 2 * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
    .attr("stroke", "grey")
    .attr("stroke-width", "1px");
}


// builds out the axes labels
function buildAxesLabels() {

    const AxesLabelMap = {
        "GFPerGame": "Goals For Per Game",
        "PassAccuracy": "Pass Accuracy",
        "AveragePossession": "Average Possession",
        "GAPerGame": "Goals Against Per Game",
        // "GoalRate": "Shot Conv. Rate", 
        "GoalRate": "Goals to Shot Ratio", 
        "ShotsPerGame": "Shots Per Game"
    };

    vis.axes
    .append("g")
    .classed("axis-label", true)
    .selectAll("text")
    .data(vis.allAxis).enter()
    .append("svg:text").classed("axis-labels", true)
    .text(function(d) { return AxesLabelMap[d]; })
    .attr("text-anchor", "middle")
    .attr("x", function(d, i) { return config.w / 2 * (1 - 1.3 * Math.sin(i * config.radians / vis.totalAxes)); })
    .attr("y", function(d, i) { return config.h / 2 * (1 - 1.1 * Math.cos(i * config.radians / vis.totalAxes)); })
    ;
}


// builds out the legend
function buildLegend(data) {
    //Create legend squares
    vis.legend
        .append("g")
        .classed("legend-tile", true)
        .selectAll("rect")
        .data(data).enter()
        .append("svg:rect").classed("legend-tiles", true)
        .attr("x", config.w - config.paddingX / 2)
        .attr("y", function(d, i) { return i * 2 * config.legendBoxSize; })
        .attr("width", config.legendBoxSize)
        .attr("height", config.legendBoxSize)
        .attr("fill", function(d, i) { return config.colors(d[0]); });

    //Create text next to squares
    vis.legend
        .append("g")
        .classed("legend-label", true)
        .selectAll("text")
        .data(data).enter()
        .append("svg:text").classed("legend-labels", true)
        .attr("x", config.w - config.paddingX / 2 + (1.5 * config.legendBoxSize))
        .attr("y", function(d, i) { return i * 2 * config.legendBoxSize; })
        .attr("dy", 0.07 * config.legendBoxSize + "em")
        .attr("font-size", 16 + "px")
        .text(function(d) { return d[0];});
}


// builds out the polygon vertices of the dataset
function buildVertices(data) {
    data.forEach(function(group) {
        vis.vertices
        .append("g")
        .classed("polygon-vertex", true)
        .selectAll("circle")
        .data(group).enter()
        .append("svg:circle").classed("polygon-vertices", true)
        .attr("r", config.polygonPointSize)
        .attr("cx", function(d, i) { return d.coordinates.x; })
        .attr("cy", function(d, i) { return d.coordinates.y; })
        .attr("fill", d => config.colors(d["Team"]))
    });
}


// builds out the polygon areas of the dataset
function buildPolygons(data) {

    // sort data in descending order by radar area
    var arr = [...data.entries()]
    arr.forEach(function(d) {
        d[0] = (d[1][0].value + d[1][2].value) * (d[1][1].value + d[1][3].value);
    });
    var data_sorted = new Map(arr.sort((a, b) => d3.descending(a[0], b[0])));

    vis.vertices
    .append("g")
    .classed("polygon-area", true)
    .selectAll("polygon")
    .data(data_sorted).enter()
    .append("svg:polygon").classed("polygon-areas", true)
    .attr("points", function(group) { // build verticesString for each group
        var verticesString = "";
        group[1].forEach(function(d) { verticesString += d.coordinates.x + "," + d.coordinates.y + " "; });
        return verticesString;
    })
    .attr("stroke-width", "2px")
    .attr("stroke", function(d, i) { return config.colors(d[1][0].Team); })
    .attr("fill", function(d, i) { return config.colors(d[1][0].Team); })
    .attr("fill-opacity", config.polygonAreaOpacity)
    .attr("stroke-opacity", config.polygonStrokeOpacity)
    .on("mouseover", function() { mouseRadarSelect(this)})
    .on("click", function() { mouseRadarSelect(this)})
    .on("mousemove", function(event, d) {
        RadarTooltipShow(d, event);
    })
    .on("mouseout", function() { mouseRadarUnSelect()})
    ;
}

function mouseRadarSelect(thisElem) {

    vis.svg.selectAll(".polygon-areas") // fade all other polygons out
    .transition(250)
    .attr("fill-opacity", 0.1)
    .attr("stroke-opacity", 0.1);
    d3.select(thisElem) // focus on active polygon
    .transition(250)
    .attr("fill-opacity", 0.7)
    .attr("stroke-opacity", config.polygonStrokeOpacity);

};

function mouseRadarUnSelect() {

    d3.selectAll(".polygon-areas")
    .transition(250)
    .attr("fill-opacity", config.polygonAreaOpacity)
    .attr("stroke-opacity", config.polygonStrokeOpacity);
    RadarTooltipHide();
};

// show tooltip of vertices
function RadarTooltipShow(d, event) {

    const team = d[1][0].Team;
    const array = d[1];
    const AxesLabelMapShort = {
        "GFPerGame": "GF Per Game",
        "PassAccuracy": "Pass Acc",
        "AveragePossession": "Avg Poss",
        "GAPerGame": "GA Per Game",
        // "GoalRate": "Shot Conv. Rate", 
        "GoalRate": "Goals to Shot RA", 
        "ShotsPerGame": "Shots Per Game"
    };

    if (window.innerWidth > 600){
        if (event.pageX - 160 > 0){
            var left_pos = event.pageX - 160;
        } else {
            var left_pos = event.pageX + 40;
        };
        if (event.pageY - 170 > 0){
            var top_pos = event.pageY - 170;
        } else {
            var top_pos = event.pageY + 60;
        }
    } else {
        if (event.pageX - 130 > 0){
            var left_pos = event.pageX - 130
        } else {
            var left_pos = event.pageX + 10
        }
        if (event.pageY - 140 > 0){
            var top_pos = event.pageY - 140;
        } else {
            var top_pos = event.pageY + 40;
        }
    }

    d3.select("#tooltip_radar")
    .classed("hidden", false)
    .style("left", left_pos + "px")
    .style("top", top_pos + "px")
    .select("#ttp_1")
    .html(team);

    d3.select("#tooltip_radar")
    .select("#ttp_2")
    .html(
        "<span>" + AxesLabelMapShort[array[0].variable] + ": " + array[0].value_org.toFixed(1) + "</span><br />" + 
        "<span>" + AxesLabelMapShort[array[5].variable] + ": " + array[5].value_org.toFixed(1) + "</span><br />" +
        "<span>" + AxesLabelMapShort[array[4].variable] + ": " + (array[4].value_org * 100).toFixed(1) + "%</span><br />" +
        "<span>" + AxesLabelMapShort[array[3].variable] + ": " + array[3].value_org.toFixed(1) + "</span><br />" +
        "<span>" + AxesLabelMapShort[array[2].variable] + ": " + array[2].value_org.toFixed(1) + "%</span><br />" +
        "<span>" + AxesLabelMapShort[array[1].variable] + ": " + array[1].value_org.toFixed(1) + "%</span><br />"
    );

    mouseBarUnselect();
}

// hide tooltip of vertices
function RadarTooltipHide() {
    d3.select("#tooltip_radar")
    .classed("hidden", true)
}
