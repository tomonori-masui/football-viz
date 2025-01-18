let xScale, yScale, colorScale;
let uniqueTeams, uniquePlayerTeams;
let svg, margin, width, height;
let bars, names, teams, values, duration;
const mobileWidth = 620;
const numberOfPlayersToPlot = 15;

export function drawPlayers() {

    d3.csv("./data/goals.csv").then(async function(goals) {

        // format the data
        goals.forEach(function(d) {
            d.date = d3.timeParse("%Y-%m-%d")(d.date);
            d.goals = parseInt(d.goals);
            d.rank = parseFloat(d.rank);
            d.teamLabel = d.team.replace(/\s/g,'');
        });

        // Create team names array
        let rawTeamValues = goals.map(function(d){ return d.team})
        uniqueTeams = [...new Set(rawTeamValues)].sort();

        // Create seasons array
        let rawPlayerTeamValues = goals.map(function(d){ return d.player_team})
        uniquePlayerTeams = [...new Set(rawPlayerTeamValues)].sort();

        let goalsGroup = d3.group(goals, d => d.date)

        defineSVG();
        setScales();
        setYAxis();
        setXAxisContainer();
        defineChartContainers();
        duration = 1000;
        let i = 0;
        let isStart = true;

        for (const [date, playerStats] of goalsGroup.entries()) {
            
            if (i > 3 && i < 70){
                let playerStatsSliced = playerStats.slice(0, numberOfPlayersToPlot);
                const transition = svg.transition()
                    .duration(duration)
                    .ease(d3.easeLinear);
                updateDate(date)
                updateXAxis(playerStatsSliced, transition);
                drawChart(playerStatsSliced, transition, isStart);
                await transition.end();
                isStart = false;
            }
            i += 1;
        };
    })
};

function defineSVG(){

    margin = {
        top: 18,
        right: window.innerWidth > mobileWidth ? 20 : 40, 
        bottom: window.innerWidth > mobileWidth ? 50 : 80, 
        left: window.innerWidth > mobileWidth ? 60 : 80
    },
    width = 800 - margin.left - margin.right,
    height = (window.innerWidth > mobileWidth ? 600 - margin.top - margin.bottom 
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

function setScales(){

    const combinedColors = [
        ...d3.schemeSet2,
        ...d3.schemeSet3,
    ];
      
    // set the ranges
    xScale = d3.scaleLinear().range([0, width]);
    yScale = d3.scaleBand().range([margin.top, height]);
    colorScale = d3.scaleOrdinal(combinedColors);

    // set the domain of the data
    // xScale.domain([0, d3.max(goals, d => d.goals) ]);
    yScale.domain(d3.range(1, numberOfPlayersToPlot + 1)).padding(.1);;
    colorScale.domain(uniqueTeams);

    console.log(numberOfPlayersToPlot, yScale(numberOfPlayersToPlot))
    console.log(numberOfPlayersToPlot+1, yScale(numberOfPlayersToPlot+1))
    console.log(numberOfPlayersToPlot+2, yScale(numberOfPlayersToPlot+2))
};

function setXAxisContainer(){

    svg.append("g")
        .attr("transform", `translate(0, ${margin.top})`)
        .attr("class", "xaxis axis");

}

function updateXAxis(data, transition){

    xScale.domain([0, d3.max(data, d => d.goals) ]);
    d3.select(".xaxis")
        .transition(transition)
        .call(d3.axisTop(xScale));
    d3.select(".domain").remove()
}

function setYAxis(){

    svg.append("g")
        .attr("class", "yaxis axis")
        .call(d3.axisLeft(yScale));
}

function defineChartContainers(){

    bars = svg.append('g')
        .attr("id", "g_bars")
        .selectAll("rect")

    names =svg.append('g')
        .attr("id", "g_names")
        .selectAll("text")

    teams = svg.append('g')
        .attr("id", "g_teams")
        .selectAll("text")

    values = svg.append('g')
        .attr("id", "g_values")
        .selectAll("text")

    svg.append('g')
        .attr("id", "g_date")
        .append("text")
        .attr("id", "date_text")
        .attr("x", width)
        .attr("y", height-30)
        .text("");
}

function drawChart(data, transition, isStart) {

    const scalingParameter = 0.9;

    bars = bars.data(data, d => d.player_team)
        .join(
            enter => enter.append("rect")
                .attr("class", "player_bars")
                .style("fill", d => colorScale(d.team))
                .attr("x", xScale(0)) 
                .attr("y", d => isStart ? yScale(d.rank) : yScale(numberOfPlayersToPlot))
                .attr("width", d => isStart ? xScale(d.goals) : xScale(d.goals*scalingParameter)) 
                .attr("height", yScale.bandwidth()),
            update => update,
            exit => exit.transition(transition).remove()
                .attr("y", d => yScale(numberOfPlayersToPlot) + yScale.bandwidth())
        )
        .call(bars => bars.transition(transition)
            .attr("y", d => yScale(d.rank))
            .attr("width", d => xScale(d.goals)));

    // Player Names
    names = names.data(data, d => d.player_team)
        .join(
            enter => enter.append("text")
                .attr("class", "name_texts")
                .attr("id", d => d.player_team)
                .text(d => d.player)
                .attr("x", d => isStart ? xScale(d.goals) - 30 : xScale(d.goals*scalingParameter) - 30)
                .attr("y", d => isStart ? yScale(d.rank) + yScale.bandwidth() * 0.5 
                    : yScale(numberOfPlayersToPlot) + yScale.bandwidth()),
            update => update, // Reuse existing elements
            exit => exit.transition(transition).remove()
                    .attr("transform", "translate(0," + (yScale(1) + yScale.bandwidth()) + ")")
                    // .attr("y", yScale(numberOfPlayersToPlot) + yScale.bandwidth())
        )
        .call(names => names.transition(transition)
            .attr("x", d => xScale(d.goals) - 30)
            .attr("y", d => yScale(d.rank) + yScale.bandwidth() * 0.5));

    // Team Names
    teams = teams.data(data, d => d.player_team)
        .join(
            enter => enter.append("text")
                .attr("class", "team_texts")
                .text(d => d.team)
                .attr("x", d => isStart ? xScale(d.goals) - 30 : xScale(d.goals*scalingParameter) - 30)
                .attr("y", d => isStart ? yScale(d.rank) + yScale.bandwidth() * 0.85 
                    : yScale(numberOfPlayersToPlot)+ yScale.bandwidth()),
            update => update,
            exit => exit.transition(transition).remove()
            .attr("transform", "translate(0," + (yScale(1) + yScale.bandwidth()) + ")")
                    // .attr("y", yScale(numberOfPlayersToPlot) + yScale.bandwidth())
        )
        .call(teams => teams.transition(transition)
            .attr("x", d => xScale(d.goals) - 30)
            .attr("y", d => yScale(d.rank) + yScale.bandwidth() * 0.85));

    // Goal Values
    values = values.data(data, d => d.player_team)
        .join(
            enter => enter.append("text")
                .attr("class", "goal_texts")
                .text(d => d.goals)
                .attr("x", d => isStart ? xScale(d.goals) - 5 : xScale(d.goals*scalingParameter) - 5)
                .attr("y", d => isStart ? yScale(d.rank) + yScale.bandwidth() * 0.6 
                    : yScale(numberOfPlayersToPlot)+ yScale.bandwidth()),
            update => update,
            exit => exit.transition(transition).remove()
            .attr("transform", "translate(0," + (yScale(1) + yScale.bandwidth()) + ")")
                    // .attr("y", yScale(numberOfPlayersToPlot) + yScale.bandwidth())
        )
        .call(values => values.transition(transition)
            .text(d => d.goals)
            .attr("x", d => xScale(d.goals) - 5)
            .attr("y", d => yScale(d.rank) + yScale.bandwidth() * 0.6));

}

function updateDate(date){

    const dateFormated = d3.timeFormat("%B %d, %Y")(date);
    d3.select("#date_text")
        .text(dateFormated)
}