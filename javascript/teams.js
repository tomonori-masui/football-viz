import { bringToFront } from './utils.js';

let xScale, yScale, rScale, colorScale, stColorScale;
let uniqueTeams, uniqueSeasons, uniqueSeasonsAsc;
let svg, margin, width, height;
let isTeamPlotted = false;
const mobileWidth = 620;

export function drawTeams() {

    d3.csv("./data/team_stats.csv").then(function(teamStats) {

        // format the data
        teamStats.forEach(function(d) {
            d.CumPts = parseInt(d.CumPts);
            d.AvgGF = parseFloat(d.AvgGF);
            d.AvgGA = parseFloat(d.AvgGA);
            d.rank = parseInt(d.rank);
            d.teamLabel = d.Team.replace(/\s/g,'');
            d.CumPtsSqrt = Math.sqrt(parseInt(d.CumPts))
        });

        // Create team names array
        let rawTeamValues = teamStats.map(function(d){ return d.Team})
        uniqueTeams = [...new Set(rawTeamValues)].sort();

        // Create seasons array
        let rawSeasonValues = teamStats.map(function(d){ return d.season})
        uniqueSeasons = [...new Set(rawSeasonValues)].sort((a, b) => b.localeCompare(a));
        uniqueSeasonsAsc = structuredClone(uniqueSeasons).sort((a, b) => a.localeCompare(b));

        defineSVG();
        setScales(teamStats);
        setAxes();
        addDropDownList(teamStats);
        drawBackgroundText(uniqueSeasons[0])
        drawDots(teamStats.filter(d => d.season == uniqueSeasons[0]), true) // draw last season
    });
};

function defineSVG(){

    margin = {
        top: 18,
        right: window.innerWidth > mobileWidth ? 20 : 40, 
        bottom: window.innerWidth > mobileWidth ? 50 : 80, 
        left: window.innerWidth > mobileWidth ? 60 : 80
    },
    width = 800 - margin.left - margin.right,
    height = (window.innerWidth > mobileWidth ? 430 - margin.top - margin.bottom 
    : 1170 - margin.top - margin.bottom
    );

    svg = d3.select("#teams_container").append("svg")
    .attr("viewBox", "0 0 " +  (width + margin.left + margin.right) 
        + " " + (height + margin.top + margin.bottom))
    .append("g")
    .attr("id", "plot")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");
}

function setScales(teamStats){

    // set the ranges
    xScale = d3.scaleLinear().range([0, width])
    yScale = d3.scaleLinear().range([height, 0])
    rScale = d3.scaleLinear().range(
        [0, window.innerWidth > mobileWidth ? width/18 :  width/10]
    );
    colorScale = d3.scaleSequential(d3.interpolateWarm);
    stColorScale = d3.scaleSequential(d3.interpolatePlasma); 

    // set the domain of the data
    let xMin = Math.max(0, d3.min(teamStats, d => d.AvgGF) - 0.2);
    let xMax = d3.max(teamStats, d => d.AvgGF) + 0.2;
    let rawYMin = d3.min(teamStats, d => d.AvgGA);
    let yMin = Math.max(0, window.innerWidth > mobileWidth ? rawYMin - 0.3 : rawYMin - 0.1);
    let rawYMax = d3.max(teamStats, d => d.AvgGA);
    let yMax = window.innerWidth > mobileWidth ? rawYMax + 0.2 : rawYMax + 0.1;
    let rMin = d3.min(teamStats, d => d.CumPtsSqrt);
    let rMax = d3.max(teamStats, d => d.CumPtsSqrt);
    xScale.domain([xMin, xMax]); 
    yScale.domain([yMin, yMax]);
    rScale.domain([rMin-1, rMax]);
    colorScale.domain([rMax, rMin]);
    stColorScale.domain([rMax, rMin]);
};

function setAxes(){

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .attr("class", "xaxis axis")
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("class", "yaxis axis")
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("class", "xaxis_title axis_title")
        .attr("text-anchor", "middle")  
        .attr("transform", "translate("+ (width/2) +","+(height+(margin.bottom*0.9))+")")
        .text("Goals For per Game");

    svg.append("text")
        .attr("class", "yaxis_title axis_title")
        .attr("text-anchor", "middle")  
        .attr("transform", "translate("+ (- margin.left*0.7) +","+(height/2)+")rotate(-90)")
        .text("Goals Against per Game");
}

function addDropDownList(teamStats){

    d3.select("#dropdown_content_season")
        .selectAll("li")
        .data(uniqueSeasons)
        .enter()
        .append("li")
        .attr("class", "dropdown_content_season_li")
        .attr("id", d => "dropdown_" + d)
        .html(d => d)
    ;
    d3.select("#dropbtn_season").html('<span class="left">' + uniqueSeasons[0] + '</span>' 
        + ' <i class="fa fa-caret-down right"></i>');
    d3.selectAll(".dropdown_content_season_li")
    .on("click", function() {
        const season = this.innerText.slice(0, 4) + "_" + this.innerText.slice(5, 9);
        changeSeason(season, teamStats);
    });

    d3.select("#dropdown_content_team")
        .selectAll("li")
        .data(uniqueTeams)
        .enter()
        .append("li")
        .attr("class", "dropdown_content_team_li")
        .attr("id", d => "dropdown_" + d.replace(/\s/g, ''))
        .html(d => d)
        ;
    d3.select("#dropbtn_team").html('<span class="left">Choose Team</span>'
        + '<i style="float: right" class="fa fa-caret-down right"></i>');
    d3.selectAll(".dropdown_content_team_li")
    .on("click", function() {
        changeTeam(this.innerText, teamStats);
    });

}

function drawBackgroundText(season){

    svg.append("g")
        .append("text")  
        .attr("id", "background_text")
        .attr("x", width)
        .attr("y", window.innerWidth > mobileWidth ? 80 : 160)
        .attr("opacity", "0")
        .transition()
        .duration(2000)
        .attr("opacity", "1")
        .text(season.slice(0, 4) + "-" + season.slice(7));
}

function drawDots(teamStats, isSeason) {

    svg.append('g')
        .attr("id", "g_dots")
        .selectAll("dot")
        .data(teamStats)
        .join("circle")
        .attr("class", "team_dots")
        .attr("id", d => isSeason ? "team_dot_" + d.teamLabel : "team_dot_" + d.season )
        .attr("cx", d => xScale(d.AvgGF))
        .attr("cy", d => yScale(d.AvgGA))
        .style("opacity", "0")
        .style("fill", d => colorScale(d.CumPtsSqrt))
        .style("stroke", d => stColorScale(d.CumPtsSqrt))
        .transition()
        .duration(2000)
        .attr("r", d => rScale(d.CumPtsSqrt))
        .style("opacity", "0.7")

    svg.append('g')
        .attr("id", "g_texts")
        .selectAll("text")
        .data(teamStats)
        .enter()
        .append("text")
        .attr("class", "team_texts")
        .attr("id", d => isSeason ? "text_" + d.teamLabel : "text_" + d.season)
        .attr("x", d => xScale(d.AvgGF))
        .attr("y", d => {
            return window.innerWidth > mobileWidth ? yScale(d.AvgGA) - rScale(d.CumPtsSqrt) - 3 :
            yScale(d.AvgGA) - rScale(d.CumPtsSqrt) - 8
        })
        .style("opacity", "0")
        .transition()
        .duration(2000)
        .text(d => isSeason ? d.Team : d.season.slice(0, 4) + "-" + d.season.slice(7))
        .style("opacity", "1")

    d3.selectAll(".team_dots")
        .on("mousemove click",
            function(event, d) { mouseDotsSelect(d, event, isSeason) ;})
        .on("mouseout", function(event, d) {mouseDotsUnselect(this);})
        ;
}

function changeSeason(season, teamStats){

    if (isTeamPlotted){
        d3.selectAll(".team_dots").remove();
        d3.selectAll(".team_texts").remove();
        d3.selectAll(".dots_connect").remove();
        d3.select("#dropbtn_team").html('<span class="left">Choose Team</span>'
            + '<i style="float: right" class="fa fa-caret-down right"></i>');
        isTeamPlotted = false;
    }

    if (season == uniqueSeasons[0]) {
        d3.select("#updated_date").style("display", "block");
    } else {
        d3.select("#updated_date").style("display", "none");
    }

    const seasonOrg = season.slice(0, 4) + "-" + season.slice(5, 9);
    d3.select("#dropbtn_season").html('<span class="left">' + seasonOrg + '</span>' 
        + ' <i class="fa fa-caret-down right"></i>');

    let teamStatsThisSeason = teamStats.filter(d => d.season == season);
    d3.select("#background_text").text(season.slice(0, 4) + "-" + season.slice(7))
    d3.selectAll(".team_dots").style("pointer-events", "none");

    for (let team of uniqueTeams) {
        let dataThisTeam = teamStatsThisSeason.filter(function(d){return d.Team == team;});
        let teamLabel = team.replace(/\s/g, '')
        
        if (dataThisTeam.length != 0 && document.getElementById("team_dot_" + teamLabel) != null) {
            updateDots(dataThisTeam, teamLabel);
        }  
        else if (dataThisTeam.length != 0 && document.getElementById("team_dot_" + teamLabel) == null){
            drawDots(dataThisTeam, true);
        }
        else {
            d3.select("#team_dot_" + teamLabel)
                .style("opacity", "0")
                .style("pointer-events", "none");
            d3.select("#text_" + teamLabel).style("opacity", "0");
        }
    } 
};

function updateDots(dataThisTeam, teamLabel){

    d3.select("#team_dot_" + teamLabel)
        .data(dataThisTeam)
        .transition()
        .duration(2000)
        .style("opacity", "0.7")
        .attr("cx", d => xScale(d.AvgGF))
        .attr("cy", d => yScale(d.AvgGA))
        .attr("r", d => rScale(d.CumPtsSqrt))
        .style("fill", d => colorScale(d.CumPtsSqrt))
        .style("stroke", d => stColorScale(d.CumPtsSqrt))
        ;

    d3.select("#text_" + teamLabel)
        .data(dataThisTeam)
        .transition()
        .duration(2000)
        .style("opacity", "1")
        .attr("x", d => xScale(d.AvgGF))
        .attr("y", d => yScale(d.AvgGA) - rScale(d.CumPtsSqrt) - 3)
        .text(d => d.Team)
        ;

    d3.timeout(() => d3.select("#team_dot_" + teamLabel).style("pointer-events", "auto"), 2000);
}

function changeTeam(Team, teamStats){

    d3.select("#dropbtn_team").html('<span class="left">' + Team + '</span>' 
        + ' <i class="fa fa-caret-down right"></i>');
    d3.select("#dropbtn_season").html(
        '<span class="left">Choose Season</span> <i class="fa fa-caret-down right"></i>');
    d3.select("#updated_date").style("display", "block")

    isTeamPlotted = true;
    d3.selectAll(".team_dots").remove();
    d3.selectAll(".team_texts").remove();
    d3.selectAll(".dots_connect").remove();
    d3.select("#background_text").text(Team)
    svg.append("g").attr("id", "g_lines")

    let teamStatsFiltered = teamStats.filter(d => d.Team == Team)
    let i = 0, delay = 800;
    uniqueSeasonsAsc.forEach(season => {
        let teamStatsFilteredOneSeason = teamStatsFiltered.filter(d => d.season == season);
        if (teamStatsFilteredOneSeason.length != 0){
            d3.timeout(() => drawDots(teamStatsFilteredOneSeason, false), delay * i);
            if (season != uniqueSeasonsAsc[0]){
                d3.timeout(() => drawDotsConnectingLine(season, teamStatsFiltered), delay * i);
            }
        }
        i += 1;
    })
}

function getXY(teamStatsFilteredOneSeason){
    return [
        xScale(teamStatsFilteredOneSeason[0].AvgGF),
        yScale(teamStatsFilteredOneSeason[0].AvgGA)
    ]
};

function drawDotsConnectingLine(season, teamStatsFiltered){
    let teamStatsThisSeason = teamStatsFiltered.filter(d => d.season == season);
    let previousSeason = parseInt(season.slice(0, 4))-1 + "_" + parseInt(season.slice(5, 9)-1);
    let teamStatsPreviousSeason = teamStatsFiltered.filter(d => d.season == previousSeason);

    if (teamStatsThisSeason.length != 0 && teamStatsPreviousSeason.length != 0){
        let thisSeasonXY = getXY(teamStatsThisSeason);
        let previousSeasonXY = getXY(teamStatsPreviousSeason);

        d3.select("#g_lines")
        .append("line") 
        .attr("class", "dots_connect")
        .style("pointer-events", "none")
        .attr("x1", previousSeasonXY[0])
        .attr("y1", previousSeasonXY[1])
        .attr("x2", previousSeasonXY[0])
        .attr("y2", previousSeasonXY[1])
        .transition()
        .duration(800)
        .attr("x2", thisSeasonXY[0])
        .attr("y2", thisSeasonXY[1])
        ;
    }
}

function mouseDotsSelect(d, event, isSeason){

    d3.select("#team_dot_" + (isSeason ? d.teamLabel : d.season))
        .style("fill", "#e74c3c")
        .style("stroke", "#922b21")
        .style("stroke-width", 3)
        .style("opacity", "0.8")
        .call(bringToFront);

    let leftPos, topPos;
    if (window.innerWidth > mobileWidth){
        if (event.pageX - 130 > 0){
            leftPos = event.pageX - 130;
        } else {
            leftPos = event.pageX + 40;
        };
        if (event.pageY - 150 > 0){
            topPos = event.pageY - 150;
        } else {
            topPos = event.pageY + 60;
        }
    } else {
        if (event.pageX - 100 > 0){
            leftPos = event.pageX - 100
        } else {
            leftPos = event.pageX + 10
        }
        if (event.pageY - 130 > 0){
            topPos = event.pageY - 130;
        } else {
            topPos = event.pageY + 40;
        }
    };

    d3.select("#tooltip_f2")
    .style("left", leftPos + "px")
    .style("top", topPos + "px")
    .select("#ttp_1")
    .html(isSeason ? d.Team
        : d.season.slice(0, 4) + "-" + d.season.slice(5, 9));

    d3.select("#tooltip_f2")
    .select("#ttp_2")
    .html(d3.format(".2f")(d.AvgGF) + "<span> GF per Game</span>");

    d3.select("#tooltip_f2")
    .select("#ttp_3")
    .html(d3.format(".2f")(d.AvgGA) + "<span> GA per Game</span>");

    const rankSuffix = d.rank == 1 ? "st" : 
        d.rank == 2 ? "nd" : d.rank == 3 ? "rd" : "th";

    d3.select("#tooltip_f2")
    .select("#ttp_4")
    .html(d.CumPts + "<span> Points / </span>" 
        + d.rank + "<span>" + rankSuffix + "</span>");

    d3.select("#tooltip_f2")
    .classed("hidden", false);
}

function mouseDotsUnselect(thisElem) {
    d3.select("#tooltip_f2")
    .classed("hidden", true);

    d3.select(thisElem)
    .style("stroke-width", "2")
    .style("fill", d => colorScale(d.CumPtsSqrt))
    .style("stroke", d => stColorScale(d.CumPtsSqrt))
    .style("opacity", "0.7");
}