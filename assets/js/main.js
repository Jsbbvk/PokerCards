



var cardHand = [];
var cardDeck = [];


var cardImages = {};
var backCard = new Image();
backCard.src = "../assets/img/cards/backcard.png";

function initCardImages() {
    for (var i = 1; i <= 13; i++) {
        var cardNum = "";
        switch(i) {
            case 1:
                cardNum = "A";
                break;
            case 11:
                cardNum = "J";
                break;
            case 12:
                cardNum = "Q";
                break;
            case 13:
                cardNum = "K";
                break;
            default:
                cardNum = "" + i;
        }

        var spade = new Image(), club = new Image(), heart = new Image(), diamond = new Image();
        spade.src = "../assets/img/cards/" + cardNum + "S.png";
        club.src = "../assets/img/cards/" + cardNum + "C.png";
        heart.src = "../assets/img/cards/" + cardNum + "H.png";
        diamond.src = "../assets/img/cards/" + cardNum + "D.png";

        cardImages[cardNum + "S"] = spade;
        cardImages[cardNum + "C"] = club;
        cardImages[cardNum + "H"] = heart;
        cardImages[cardNum + "D"] = diamond;
    }
}

var cardPlacementOffset = 50;
var numCardPlacement = 0;
function addDraggableCard(cStr) {
    //TODO give the element an id/data-attr
    //TODO place card outside of card area
    var nC = document.createElement("DIV");
    nC.classList.add("card");
    nC.classList.add("draggable");
    nC.style.transform = "translate(0, " + (cardPlacementOffset * numCardPlacement) + "px)";
    nC.setAttribute("data-y", (cardPlacementOffset*numCardPlacement));
    if (numCardPlacement == 5) {
        numCardPlacement = 0;
    }
    numCardPlacement++;
    nC.appendChild(cardImages[cStr.tag].cloneNode(true));
    document.getElementById("cardArea").appendChild(nC);

    initializeDraggables();
}

function getRandomCard() {
    socket.emit('get random card', function(crd) {
        addDraggableCard(crd);
    });
}

$(document).ready(function() {
    initCardImages();
});

/* END CARD SETUP */



var gamemode = -1;
const BLACK_JACK = 0;


var gamestate = -1;
const BJ_STATE  = {
    PLAYING: 1,
    RESULTS: 2
};

var playerName = "";
var nameID = "";
var roomID = "";
var numPlayers = 0;


socket.on('get room info', function(cb) {
   cb&&cb(roomID, nameID);
});



socket.on('game start', function(gm) {
    startPlayingGame(gm);
});

function startPlayingGame(gm) {
    if (gm==-1)return;

    optionsActive = false;
    $('#waiting-room').fadeOut(400, function() {

        document.getElementById("waiting-options").style.display = "none";
        document.getElementById("waiting-room").style.display = "none";
        socket.removeAllListeners("start game");
        socket.removeAllListeners("update game mode");
        socket.removeAllListeners("update players");

        $('#playerScreen').css('display','block');
        if (gm==BLACK_JACK) {
            gamemode = BLACK_JACK;
            initBlackJack();
        }
    });
}


function endGame(e) {
    e.preventDefault();
    socket.emit('end game', roomID);
}

function leave(e) {
    e.preventDefault();
    socket.emit('delete player', roomID, nameID, function() {
        isLeaving = true;
        location.reload();
    });
}


function clearAllListeners() {
    socket.removeAllListeners("game ended");
    cardHand = [];
    cardDeck = [];


    /* start blackjack listeners */

    socket.removeAllListeners("bj all players ended");
    socket.removeAllListeners("bj next round addition");
    socket.removeAllListeners("display current view");
    socket.removeAllListeners("bj next round start");

    $(".button-pressable").off();
    $('#bj_hit_button').off();
    $('#bj_stand_button').off();
    $('#bj_rules_button').off();
    $('#bj_settings_display_close_button').off();
    $('#bj_readyForNextRound').off();
    $('#bj_leave_game_button').off();
    $('#bj_end_game_button').off();
    $('#bj_display_players_button').off();
    $('#bj_player_display_close_button').off();
    /* end blackjack listeners */

    socket.removeAllListeners("display current view");
    socket.on('display current view', function(gstart, gmode, gstate) {
        if (!gstart) {
            displayWaitingRoom();
        } else {
            startPlayingGame(gmode);
        }
    });
}

clearAllListeners();





