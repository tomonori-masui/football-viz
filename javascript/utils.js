// Select the SVG object and bring it to the front
export function bringToFront(selection) {
    selection.each(function() {
        this.parentNode.appendChild(this);
    });
}
