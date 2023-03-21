function getLastDate() {
    fetch('./data/last_date')
    .then(response => response.text())
    .then(function(text) {
        var updatedDate = document.getElementById('updated_date');
        updatedDate.innerHTML = "on " + text;
    });
}