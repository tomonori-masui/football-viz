function makeMatchesList() {

    const header = document.createElement("div");
    header.setAttribute("id", "matches_header");
    header.classList.add("matches", "hidden");

    const matches_container = document.getElementById("matches_container");
    matches_container.appendChild(header);

    for (let i = 0; i < 12; i++) {

        const match = document.createElement("div");
        match.setAttribute("id", "match_" + i);
        match.classList.add("matches", "hidden");

        const classes = ["matches_date", "matches_result", "matches_home", "matches_center", "matches_away"]

        classes.forEach(function (class_name) {

            const elememnt = document.createElement("div");
            elememnt.classList.add(class_name, "match_element");

            if (i == 0 && class_name == "matches_home"){
                const home = document.createTextNode("Home \xa0\xa0\xa0\xa0");
                elememnt.appendChild(home);
            };

            if (i == 0 && class_name == "matches_away"){
                const away = document.createTextNode("\xa0\xa0\xa0\xa0 Away");
                elememnt.appendChild(away);
            };

            if (i != 0 && class_name == "matches_center"){
                const dash = document.createTextNode("-");
                elememnt.appendChild(dash);
            };

            match.appendChild(elememnt);

        });

        matches_container.appendChild(match);
    }
}