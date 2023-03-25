function showDrop(DrpID) {
    document.getElementById(DrpID).classList.toggle("show");
};

function AddDropdownClickEvent() {
    // Close the dropdown if the user clicks outside of it
    window.onclick = function(event) {

        // This is necessary as iOS touch screen has hover event on a touch which keeps dropdown list appear even when the list is touched
        // d3.selectAll(".dropdown").classed("notouch", false);

        if (!event.target.matches('.dropbtn')) {

            var dropdowns = document.getElementsByClassName("dropdown_content");
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    };
};