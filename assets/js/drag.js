//TODO add a initial force to the card


var maxZIndex = 1;

function initializeDraggables() {
    interact('.draggable')
        .draggable({
            inertia: {
                resistance: 15
            },
            // keep the element within the area of it's parent
            restrict: {
                restriction: "#cardArea",
                endOnly: true,
                elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
            },
            autoScroll: false,
            onmove: onDragMove,
            onend: onDragEnd
        });


    $('.draggable').on("mousedown touchstart", function(e) {
        $(this).css('z-index', ++maxZIndex);
        $(this).addClass("selectedCard");
    });

    $('.draggable').on("mouseup touchend", function(e) {
        $(this).removeClass("selectedCard");
    });
}


function onDragEnd(event) {
    //check which card was placed... etc...

    //get the card value...
    var textEl = event.target.querySelector('p');


}

function onDragMove (event) {
    var target = event.target;
    // keep the dragged position in the data-x/data-y attributes
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // translate the element
    target.style.webkitTransform =
        target.style.transform =
            'translate(' + x + 'px, ' + y + 'px)';

    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}
