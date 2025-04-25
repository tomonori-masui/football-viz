import { bringToFront } from './utils.js';

let xScale, yScale, colorScale;
let selectedGoals, goalsCumSumGroup, 
    goalsGroup, playerLastStandingsTop10, dataLength, valueline;
let svg, margin, width, height;
let playerLastStandings = {};
let playerLastValues = {};
let playerNameWidth;
let valueCounts = {};
let playersPerValue = {};
let valueCountsArray = [];
const mobileWidth = 620;
const formatDate = d3.timeFormat("%y-%m-%d");
const latestSeason = "2024_2025";

export function drawPlayers() {
    defineSVG();
    drawPlots(latestSeason, 'Goals');
};

function defineSVG(){

    margin = {
        top: window.innerWidth > mobileWidth ? 20 : 60,
        right: window.innerWidth > mobileWidth ? 25 : 70, 
        bottom: window.innerWidth > mobileWidth ? 50 : 80, 
        left: window.innerWidth > mobileWidth ? 60 : 80
    },
    width = 800 - margin.left - margin.right,
    height = (window.innerWidth > mobileWidth ? 530 - margin.top - margin.bottom 
    : 1170 - margin.top - margin.bottom
    );

    svg = d3.select("#players_container").append("svg")
    .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) 
        + " " + (height + margin.top + margin.bottom))
    .append("g")
    .attr("id", "plot")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
}

function drawPlots(season, statsType){

    const statsTypeLower = statsType.toLowerCase();

    d3.csv(`./data/${statsTypeLower}_cumsum_${season}.csv`).then(function(goalsCumSum) {
        d3.csv(`./data/${statsTypeLower}_${season}.csv`).then(function(goals) {

            // format the data
            goalsCumSum.forEach(function(d) {
                d.date = d3.timeParse("%Y-%m-%d")(d.date);
                d.value = parseInt(d.value);
                d.rank = parseFloat(d.rank);
                d.pk = parseInt(d.pk);
            });

            const maxDate = d3.max(goalsCumSum, d => d.date)
            console.log("maxDate", maxDate);

            const maxDateFormat = d3.timeFormat("%b %d, %Y")(maxDate);
            d3.select("#updated_date")
            .html("on " + maxDateFormat)

            goals.forEach(function(d) {
                d.date = d3.timeParse("%Y-%m-%d")(d.date);
                d.value = parseInt(d.value);
                d.cum_sum = parseInt(d.cum_sum);
                d.pk = parseInt(d.pk);
            });

            createData(goalsCumSum, goals);
            setScales(goalsCumSum);
            setYAxis(statsType);
            setXAxis();

            drawLines(goalsCumSumGroup);
            drawPlayerCountTexts(valueCountsArray);
            drawValueCircles(goalsCumSumGroup);
            drawPlayerTexts(goalsCumSumGroup);
            putPlayerBackground();
            drawMatchDots(goalsGroup);
            animation(season, statsType);
        });
    });
};

function changeStats(season, statsType) {
    d3.select("#dropbtn_players").html('<span class="left">' + statsType + '</span>' 
        + ' <i class="fa fa-caret-down right"></i>');
    const season_org = season.slice(0, 4) + "-" + season.slice(5, 9);
    d3.select("#dropbtn_season").html('<span class="left">' + season_org + '</span>' 
        + ' <i class="fa fa-caret-down right"></i>');

    d3.select("#g_line_thin").remove();
    d3.select("#g_line_fat").remove();
    d3.select("#g_player_count_text").remove();
    d3.select("#g_player_text").remove();
    d3.selectAll(".g_match_dots").remove();
    d3.selectAll(".g_match_dots_fat").remove();
    d3.selectAll(".axis").remove();
    d3.select(".yaxis_title").remove();

    playerLastStandings = {};
    valueCounts = {};
    playersPerValue = {};
    valueCountsArray = [];
    dataLength = undefined;

    if (season == latestSeason) {
        d3.select("#updated_date").style("display", "block")
    } else {
        d3.select("#updated_date").style("display", "none")
    }

    drawPlots(season, statsType);
};

function createData(goalsCumSum, goals){

    goalsCumSumGroup = d3.group(goalsCumSum, d => d.player_team);
    goalsGroup = d3.group(goals, d => d.player_team);
    
    for (const [key, value] of goalsCumSumGroup.entries()) {
        playerLastStandings[key] = value[value.length-1].rank;
        playerLastValues[key] = value[value.length-1].value;
        if (value[value.length-1].value in valueCounts){
            valueCounts[value[value.length-1].value] += 1;
            playersPerValue[value[value.length-1].value].push(key)
        } else {
            valueCounts[value[value.length-1].value] = 1;
            playersPerValue[value[value.length-1].value] = [key]
        }
        if (dataLength == undefined){
            dataLength = value.length;
        }
    };
    for (const [key, value] of Object.entries(valueCounts)) {
        if (value > 1){
            valueCountsArray.push({goal: key, count: value})
        }
    };

    playerLastStandingsTop10 = (
        Object.entries(playerLastStandings).sort(([, v1], [, v2]) => v2 - v1).slice(-10)
    )
}

function setScales(goalsCumSum){

    // set the ranges
    playerNameWidth = window.innerWidth > mobileWidth ? 150 : 200;
    xScale = d3.scaleTime().range([0, width - playerNameWidth]);
    yScale = d3.scaleLinear().range([0, height]);
    colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // set the domain of the data
    xScale.domain(d3.extent(goalsCumSum, d => d.date));
    yScale.domain([d3.max(goalsCumSum, d => d.value), 0]);
    colorScale.domain(Object.values(playerLastStandings).sort((a, b) => d3.ascending(a, b)));
};

function setXAxis(){

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .attr("class", "xaxis axis")
        .call(d3.axisBottom(xScale));

    d3.selectAll(".xaxis")
        .selectAll("text")
        .attr("transform", "translate(-15," + (window.innerWidth > mobileWidth ? 17 : 30) + ")rotate(-45)")
        ;
}

function setYAxis(statsType){

    svg.append("g")
        .attr("class", "yaxis axis")
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("class", "yaxis_title")
        .attr("text-anchor", "middle")  
        .attr("transform", "translate("+ (- margin.left*0.7) +","+(height/2)+")rotate(-90)")  
        .text(statsType);
}

function drawLines(goalsCumSumGroup, setLineData = false){

    valueline = d3.line()
    .curve(d3.curveMonotoneX)
    .x(function(d) { return xScale(d.date); })
    .y(function(d) { return yScale(d.value); });

    svg.append("g")
        .attr("id", "g_line_thin")
        .selectAll("path")
        .data(goalsCumSumGroup)
        .join("path")
        .attr("class", "line_thin")
        .attr("id", d => "line_" + d[0])
        .style('stroke', d => playerLastStandings[d[0]] <= 10 ? 
            colorScale(playerLastStandings[d[0]]) : "LightGray");

    if (setLineData) {
        d3.selectAll(".line_thin")
        .attr("d", d => valueline(d[1]));
    };

    svg.append("g")
        .attr("id", "g_line_fat")
        .selectAll("path")
        .data(goalsCumSumGroup)
        .join("path")
        .attr("class", "line_fat")
        .attr("d", (d) => valueline(d[1]));

    bringTopNLinesToFront();
}

function bringTopNLinesToFront(){

    playerLastStandingsTop10.forEach(values => {
        d3.select("#line_" + values[0]).call(bringToFront);
    })
}

function drawPlayerCountTexts(valueCountsArray, hide = true){

    svg.append("g")
        .attr("id", "g_player_count_text")
        .selectAll("text")
        .data(valueCountsArray)
        .enter()
        .append("text")
        .attr("class", "player_count_text")
        .attr("dy", "0.35em")
        // .attr("dx", "2.1em")
        .attr("id", function(d) { return "player_count_text_" + d.goal; })
        .style('fill',"DimGray")
        .attr("x", width-playerNameWidth)
        .attr("y", d => yScale(d.goal))
        .text(d => d.count + " players")
        ;
    
    if (hide){
        d3.selectAll(".player_count_text")
        .style("opacity", "0");
    };
}

function drawValueCircles(goalsCumSumGroup, hide = true){

    svg.append("g")
        .attr("id", "g_player_text")
        .selectAll("circle")
        .data(goalsCumSumGroup)
        .enter()
        .append("circle")
        .attr("class", "dots")
        .attr("r", window.innerWidth > mobileWidth ? "8" : "16")
        .attr("cx", d => {
            let dx = window.innerWidth > mobileWidth ? 15 : 26;
            return width-playerNameWidth+dx
        })
        .attr("cy", d => yScale(d[1][d[1].length-1].value))
        .style('fill', d => playerLastStandings[d[0]] <= 10 ?
            colorScale(playerLastStandings[d[0]]) : "LightGray")
        .attr("id", function(d) { return "dot_" + d[0]; })
        ;

    d3.select("#g_player_text")
        .selectAll(".value_text")
        .data(goalsCumSumGroup)
        .enter()
        .append("text")
        .attr("class", "value_text")
        .attr("dy", "0.35em")
        .attr("id", function(d) { return "value_text_" + d[0]; })
        .attr("text-anchor", "middle") 
        .style('fill', "#303030")
        .attr("x", d => {
            let dx = window.innerWidth > mobileWidth ? 15 : 26;
            return width-playerNameWidth+dx
        })
        .attr("y", d => yScale(d[1][d[1].length-1].value))
        .text(function(d) { return d[1][d[1].length-1].value; })
        ;

    if (hide){
        d3.selectAll(".dots, .value_text")
        .style("opacity", "0");
    };
}

function drawPlayerTexts(goalsCumSumGroup, hide = true){

    d3.select("#g_player_text")
        .selectAll(".player_text, .group_player_text")
        .data(goalsCumSumGroup)
        .enter()
        .append("text")
        .attr("class", d => valueCounts[d[1][d[1].length-1].value] == 1 ?
            "player_text" : "group_player_text")
        .attr("dy", "0.35em")
        .attr("id", function(d) { return "player_text_" + d[0]; })
        .style('fill', d => playerLastStandings[d[0]] <= 10 ?
            colorScale(playerLastStandings[d[0]]) : "DimGray")
        .text(d => d[1][0].player)
        .style("pointer-events", d=> valueCounts[d[1][d[1].length-1].value] == 1 ? "auto" : "none")
        .style("opacity", d => valueCounts[d[1][d[1].length-1].value] == 1 ? "1" : "0")
        ;
    
    if (hide){
        d3.selectAll(".player_text, .group_player_text")
        .style("opacity", "0");
    };
}

function putPlayerBackground(){

    d3.select("#g_player_text")
        .append("rect")
        .attr("id", "player_background")
        .attr("width", window.innerWidth > mobileWidth ? "160" : "260")
        .attr("height", "100")
        .attr("x", width-playerNameWidth + 4)
        .attr("y", "100")
        .attr("rx", window.innerWidth > mobileWidth ? "8" : "16")
        .attr("ry", window.innerWidth > mobileWidth ? "8" : "16")
        .attr("fill", "#f8f9f9")
        .style("stroke", "#cacfd2")
        .style("stroke-width", "1.5")
        .style("pointer-events", "none")
        .style("opacity", 0)
}

function drawMatchDots(goalsGroup){

    for (const [key, values] of goalsGroup.entries()) {

        svg.append("g")
            .attr("id", "g_match_dots_" + key)
            .attr("class", "g_match_dots")
            .selectAll("circle")
            .data(values)
            .enter()
            .append("circle")
            .attr("id", d => "match_dots_" + key + "_" + formatDate(d.date))
            .attr("class", "match_dots match_dots_" + key)
            .attr("r", window.innerWidth > mobileWidth ? "3.5" : "7.5")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.cum_sum))
            .style('fill', d => colorScale(playerLastStandings[key]))
            .style("opacity", "0")
            ;

        svg.append("g")
            .attr("id", "g_match_dots_fat_" + key)
            .attr("class", "g_match_dots_fat")
            .selectAll("circle")
            .data(values)
            .enter()
            .append("circle")
            .attr("id", d => "match_dots_fat_" + key + "_" + formatDate(d.date))
            .attr("class", "match_dots_fat match_dots_fat_" + key)
            .attr("r", window.innerWidth > mobileWidth ? "10" : "14")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.cum_sum))
            .style('fill', d => colorScale(playerLastStandings[key]))
            .style("opacity", "0")
            ;
    }
};

function animation(season, statsType){

    d3.selectAll(".player_text, .group_player_text")
        .attr("x", d => {return xScale(d[1][0].date);})
        .attr("y", d => {return yScale(d[1][0].value);});

    const t = d3.timer((elapsed) => {
        d3.selectAll(".line_thin")
        .style('opacity', d => playerLastStandings[d[0]] <= 10 ? "1" : "0")
        .attr("d", d => valueline(d[1].slice(0, parseInt(elapsed/25))));

        let curIdx = parseInt(elapsed/25);

        d3.selectAll(".player_text, .group_player_text")
        .style('opacity', d => playerLastStandings[d[0]] <= 10 ? "1" : "0")
        .transition()
        .duration(40)
        .ease(d3.easeLinear)
        .attr("x", d => {
            return xScale(curIdx >= dataLength ? d[1][dataLength-1].date : d[1][curIdx].date);
        })
        .attr("y", d => {
            return yScale(curIdx >= dataLength ? d[1][dataLength-1].value : d[1][curIdx].value);
        })
        
        if (elapsed > 29*dataLength) {
            t.stop();

            d3.selectAll(".line_thin")
            .transition()
            .duration(1000)
            .style("opacity", "1");

            d3.selectAll(".player_text, .group_player_text")
            .transition()
            .duration(1000)
            .style("opacity", d => valueCounts[d[1][d[1].length-1].value] == 1 ? "1" : "0")
            .attr("transform", function(d) { 
                let offset = window.innerWidth > mobileWidth ? 28 : 48;
                return "translate(" + offset + ", 0)";})
            .attr("x", width-playerNameWidth)
            .attr("y", d => yScale(d[1][d[1].length-1].value))
            ;

            d3.selectAll(".dots")
            .transition()
            .delay(500)
            .duration(1000)
            .style("opacity", "1");

            d3.selectAll(".value_text")
            .transition()
            .delay(500)
            .duration(1000)
            .style("opacity", "1");

            d3.selectAll(".player_count_text")
            .attr("transform", function(d) { 
                let offset = window.innerWidth > mobileWidth ? 28 : 48;
                return "translate(" + offset + ", 0)";})
            .transition()
            .delay(500)
            .duration(1000)
            .style("opacity", "1")
            ;

            setEvents(season, statsType);
        }
    }, 30);
}

function setEvents(season, statsType){

    d3.selectAll(".line_fat")
    .on("mouseover", function(event, d) { mouseLineSelect(d) ;})
    .on("click", function(event, d) { mouseLineSelect(d) ;})
    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
    ;

    d3.selectAll(".player_text")
    .on("mouseover", function(event, d) {
        mouseLineSelect(d);
        mousePlayerTextSelect(d, event, statsType);
    })
    .on("click", function(event, d) {
        mouseLineSelect(d);
        mousePlayerTextSelect(d, event, statsType);
    })
    .on("mouseout", function(event, d) {
        mouseLineUnselect();
        mousePlayerTextUnselect();
    })
    ;

    d3.selectAll(".dots")
    .on("mouseover", function(event, d) { mouseLineSelect(d) ;})
    .on("click", function(event, d) { mouseLineSelect(d);})
    .on("mouseout", function(event, d) { mouseLineUnselect() ;})
    ;

    d3.selectAll(".player_count_text")
    .on("mouseover", function(event, d) { mouseTextSelect(d) ;})
    .on("click", function(event, d) { mouseTextSelect(d);})
    .on("touchstart", function(event, d) {
        event.preventDefault(); // prevents ghost click on mobile
        event.stopPropagation();
        mouseTextSelect(d);
        mouseBackgroundSelect();
    });

    d3.selectAll("#player_background")
    .on("mouseover", function(event, d) { mouseBackgroundSelect() ;})
    .on("click", function(event, d) { mouseBackgroundSelect();})
    .on("mouseout", function(event, d) { mouseGroupPlayerUnSelect() ;})
    ;

    d3.selectAll(".group_player_text")
    .on("mouseover", function(event, d) {
        mouseGroupPlayerSelect(d);
        mousePlayerTextSelect(d, event, statsType);
    })
    .on("click", function(event, d) {
        mouseGroupPlayerSelect(d);
        mousePlayerTextSelect(d, event, statsType);
    })
    .on("mouseout", function(event, d) {
        mouseGroupPlayerUnSelect();
        mousePlayerTextUnselect();
    })
    ;

    d3.selectAll(".match_dots_fat")
    .on("mouseover", function(event, d) {
        mouseMatchDotsSelect(d, event, statsType);
        lineSelect(d.player_team);
    })
    .on("click", function(event, d) {
        mouseMatchDotsSelect(d, event, statsType);
        lineSelect(d.player_team);
    })
    .on("mouseout", function(event, d) {
        mouseMatchDotsUnselect();
        mouseLineUnselect();
    })
    ;

    // Add dropdown event
    d3.select("#dropdown_stats")
    .selectAll(".dropdown_content_li")
    .on("click", function() {
        const statsType = this.innerText;
        changeStats(season, statsType);
    });

    d3.select("#dropdown_season")
    .selectAll(".dropdown_content_li")
    .on("click", function() {
        const seasonSelected = this.innerText.slice(0, 4) + "_" + this.innerText.slice(5, 9);
        changeStats(seasonSelected, 'Goals');
    });

    // Touch screen device needs additional event listener to unselect objects
    d3.select(document).on("touchstart", function(event) {
        if (!event.target.closest(".player_count_text, .group_player_text, #player_background")) {
            mouseGroupPlayerUnSelect();
        }
    });
}

function mousePlayerTextSelect(d, event, statsType) {

    positionTooltip(event);

    const player = d[1][0].player;
    const team = d[1][0].team;
    const value = d[1][d[1].length-1].value;
    const pk = d[1][d[1].length-1].pk;
    const date = null;
    showTooltip(player, team, value, pk, date, statsType);
};

function positionTooltip(event) {

    let leftPos, topPos;
    if (window.innerWidth > mobileWidth){
        if (event.pageX - 110 > 0){
            leftPos = event.pageX - 110;
        } else {
            leftPos = event.pageX + 40;
        };
        if (event.pageY - 110 > 0){
            topPos = event.pageY - 110;
        } else {
            topPos = event.pageY + 60;
        }
    } else {
        if (event.pageX - 90 > 0){
            leftPos = event.pageX - 90
        } else {
            leftPos = event.pageX + 10
        }
        if (event.pageY - 90 > 0){
            topPos = event.pageY - 90;
        } else {
            topPos = event.pageY + 40;
        }
    };

    d3.select("#tooltip_f3")
    .style("left", leftPos + "px")
    .style("top", topPos + "px");
}

function showTooltip(player, team, value, pk, date, statsType) {

    d3.select("#tooltip_f3")
    .select("#ttp_1")
    .html(player);

    d3.select("#tooltip_f3")
    .select("#ttp_2")
    .html("<span>" + team + "</span>");

    const statsTypeLower = statsType.toLowerCase();

    d3.select("#tooltip_f3")
    .select("#ttp_3")
    .html(
        (date == null ? "" : "<span>" + date + " |</span> ") + value + " <span>"
        + (value > 1 ? statsTypeLower : statsTypeLower.slice(0, -1))
        + (pk > 1 || pk == 0 ? " (" + pk + " PKs)</span>" :
            pk == 1 ? " (" + pk + " PK)</span>" : "</span>")
    );

    d3.select("#tooltip_f3")
    .classed("hidden", false);
}

function mousePlayerTextUnselect() {
    d3.select("#tooltip_f3")
    .classed("hidden", true);
}

function mouseLineSelect(d) {
    let playerTeam = d[0];
    lineSelect(playerTeam);
};

function lineSelect(playerTeam) {

    let lastGoal = playerLastValues[playerTeam];

    d3.selectAll(".line_thin")
    .style("stroke", "LightGray")
    .classed("selected", false);
    d3.selectAll(".player_text").style("fill", "LightGray");
    d3.selectAll(".player_count_text").style("fill", "LightGray");
    d3.selectAll(".dots").style("fill", "LightGray");
    d3.select("#player_count_text_" + lastGoal).style("opacity", "0");

    d3.selectAll(".group_player_text")
    .style("opacity", "0")
    .style("pointer-events", "none")

    d3.select("#player_background")
    .style("opacity", "0")
    .style("pointer-events", "none")

    d3.select("#line_" + playerTeam)
    .style('stroke', colorScale(playerLastStandings[playerTeam]))
    .classed("selected", true)
    .call(bringToFront)
    ;

    d3.select("#player_text_" + playerTeam)
    .attr("transform", function(d) { 
        let offset = window.innerWidth > mobileWidth ? 28 : 48;
        return "translate(" + offset + ", 0)";})
    .style('fill', colorScale(playerLastStandings[playerTeam]))
    .style("opacity", "1")
    .call(bringToFront);

    d3.select("#dot_" + playerTeam)
    .style('fill', colorScale(playerLastStandings[playerTeam]))
    .style("opacity", "1")
    .call(bringToFront);

    d3.select("#value_text_" + playerTeam)
    .call(bringToFront);

    d3.selectAll(".match_dots_" + playerTeam)
    .style("opacity", "1")
};

function mouseLineUnselect() {

    d3.selectAll(".line_thin")
    .classed("selected", false)
    .style('stroke', d => playerLastStandings[d[0]] <= 10 ? 
        colorScale(playerLastStandings[d[0]]) : "LightGray");

    d3.selectAll(".player_text")
    .style('fill', d => colorScale(playerLastStandings[d[0]]));

    d3.selectAll(".player_count_text")
    .style("fill", "DimGray")
    .style("opacity", "1");

    d3.selectAll(".group_player_text")
    .style('fill', d => colorScale(playerLastStandings[d[0]]))
    .style("opacity", d => "0");

    d3.selectAll(".value_text")
    .style('fill', "#303030");

    d3.selectAll(".dots")
    .style('fill', d => playerLastStandings[d[0]] <= 10 ?
        colorScale(playerLastStandings[d[0]]) : "LightGray");

    d3.selectAll(".match_dots")
    .style("opacity", "0");

    bringTopNLinesToFront();
};

function mouseTextSelect(d){

    const players = playersPerValue[d.goal];
    selectedGoals = d.goal;

    let hOffset = window.innerWidth > mobileWidth ? 28 : 48;
    let vOffsetUnit = window.innerWidth > mobileWidth ? 19 : 35;

    d3.selectAll(".player_count_text")
    .style("pointer-events", "none");

    d3.selectAll(".dots").style("fill", "LightGray");

    d3.select("#player_background")
    .attr("y", function(){
        let subtract = window.innerWidth > mobileWidth ? 0 : 10;
        return yScale(d.goal) - (players.length / 2 * vOffsetUnit) - subtract;
    })
    .attr("height", function(d){
        let add = window.innerWidth > mobileWidth ? 2 : 4;
        return (players.length) * vOffsetUnit + add;
    })
    .style("opacity", "1")
    .style("pointer-events", "auto")
    .call(bringToFront);

    for (let i = 0; i < players.length; i++) {
        d3.select("#player_text_" + players[i])
        .style("opacity", "1")
        .style('fill', d => colorScale(playerLastStandings[d[0]]))
        .attr("transform", function(d) { 
            return `translate(${hOffset}, ${i*vOffsetUnit - (players.length / 2 * vOffsetUnit) + 10})`;})
        .call(bringToFront)

        d3.select("#dot_" + players[i])
        .style('fill', colorScale(playerLastStandings[players[i]]))
        .style("opacity", "1")
        .call(bringToFront);

        d3.select("#value_text_" + players[i])
        .call(bringToFront);
    }
}

function mouseBackgroundSelect(){

    d3.select("#player_background")
    .style("opacity", "1")
    .style("pointer-events", "auto")
    ;

    d3.selectAll(".line_thin")
    .style("stroke", "LightGray")
    .classed("selected", false);
    d3.selectAll(".player_text").style("fill", "LightGray");
    d3.selectAll(".match_dots")
        .attr("r", window.innerWidth > mobileWidth ? "3.5" : "6.5")
        .style("opacity", "0")
    d3.selectAll(".player_count_text").style("fill", "LightGray");
    d3.selectAll(".dots").style("fill", "LightGray");

    d3.select("#tooltip_f3")
    .classed("hidden", true);

    const players = playersPerValue[selectedGoals];

    for (let i = 0; i < players.length; i++) {
        d3.select("#player_text_" + players[i])
        .style("opacity", "1")
        .style("pointer-events", "auto");

        d3.select("#dot_" + players[i])
        .style('fill', colorScale(playerLastStandings[players[i]]))
        .style("opacity", "1");
    }
}

function mouseGroupPlayerSelect(d) {

    d3.selectAll(".line_thin")
    .style("stroke", "LightGray")
    .classed("selected", false);
    d3.selectAll(".player_text").style("fill", "LightGray");
    d3.selectAll(".group_player_text").style("fill", "LightGray");
    d3.selectAll(".player_count_text").style("fill", "LightGray");
    d3.selectAll(".dots").style("fill", "LightGray");

    mouseBackgroundSelect();

    let playerTeam = d[0];

    d3.select("#player_text_" + playerTeam)
    .style('fill', colorScale(playerLastStandings[playerTeam]));

    d3.select("#line_" + playerTeam)
    .style('stroke', colorScale(playerLastStandings[playerTeam]))
    .classed("selected", true)
    .call(bringToFront)
    ;

    d3.select("#dot_" + playerTeam)
    .style('fill', colorScale(playerLastStandings[playerTeam]))
    .style("opacity", "1")
    .call(bringToFront);

    d3.select("#value_text_" + playerTeam)
    .style('fill', "#303030")
    .style("opacity", "1")
    .call(bringToFront);

    d3.selectAll(".match_dots_" + playerTeam)
    .style("opacity", "1")
};

function mouseGroupPlayerUnSelect() {

    d3.selectAll(".line_thin")
    .classed("selected", false)
    .style('stroke', d => playerLastStandings[d[0]] <= 10 ? 
        colorScale(playerLastStandings[d[0]]) : "LightGray");

    d3.selectAll(".player_text")
    .style('fill', d => colorScale(playerLastStandings[d[0]]));

    if (selectedGoals != undefined){
        const players = playersPerValue[selectedGoals];
        for (let i = 0; i < players.length; i++) {
            d3.select("#player_text_" + players[i])
            .style('fill', d => colorScale(playerLastStandings[d[0]]))
        }
    }

    d3.selectAll(".player_count_text")
    .style("fill", "DimGray")
    .style("opacity", "1")
    .style("pointer-events", "auto");

    d3.selectAll(".value_text")
    .style('fill', "#303030");

    d3.selectAll(".dots")
    .style('fill', d => playerLastStandings[d[0]] <= 10 ?
        colorScale(playerLastStandings[d[0]]) : "LightGray")
    ;

    d3.select("#player_background")
    .style("opacity", 0)
    .style("pointer-events", "none");

    d3.selectAll(".group_player_text")
    .style("pointer-events", "none")
    .style("opacity", "0");

    d3.selectAll(".match_dots")
    .style("opacity", "0");

    bringTopNLinesToFront();
};


function mouseMatchDotsSelect(d, event, statsType){

    d3.selectAll(".match_dots_" + d.player_team)
    .style("opacity", "1")

    d3.select("#match_dots_" + d.player_team + "_" + formatDate(d.date))
    .attr('r', window.innerWidth > mobileWidth ? "6" : "11");

    positionTooltip(event);
    const date = d3.timeFormat("%b %d")(d.date);
    showTooltip(d.player, d.team, d.cum_sum, d.pk, date, statsType);
};

function mouseMatchDotsUnselect() {
    d3.select("#tooltip_f3")
    .classed("hidden", true);

    d3.selectAll(".match_dots")
    .attr("r", window.innerWidth > mobileWidth ? "3.5" : "6.5")
    .style("opacity", "0")
};
