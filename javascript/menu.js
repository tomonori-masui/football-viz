function changeMenuColor(objectID) {
    var menu_li = document.getElementsByClassName("menu_li");
    var i;
    for (i = 0; i < menu_li.length; i++) {
        var menu_elem = menu_li[i];
        if (menu_elem.classList.contains('active')) {
            menu_elem.classList.remove('active');
        }
    };

    document.getElementById(objectID).classList.toggle('active');
};