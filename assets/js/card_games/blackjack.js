


function initBlackJack() {
    socket.removeAllListeners("display current view");
    socket.on('display current view', function(gstart, gmode, gstate) {

        if (!gstart) {
            $('#blackjack').css('display','none');
            clearAllListeners();
            displayWaitingRoom();
            return;
        }

        //TODO check if the game started or not
        if (gamestate == gstate && gstate == BJ_STATE.RESULTS) {
            gamestate = gstate;
            socket.emit('get players', roomID, function(pl) {
                var c = 0;
                pl.forEach(function(p) {
                    if (p.nextRound) c++;
                });
                $('#bj_readyForNextRoundText').text(((isReadyNextRound)?"Ready":"Next Round?")+" " + c + "/" + pl.length);
            });
        }

        if (gamestate == gstate) return;
        gamestate = gstate;

        $('#bj_settings_display').css('display', 'none');
        $('#bj_rules_button').css('display','block');
        $('#bj_player_display').css('display', 'none');
        $('#bj_display_players_button').css('display','block');


        socket.removeAllListeners("bj next round addition");
        socket.removeAllListeners("bj next round start");


        if (gamestate == BJ_STATE.PLAYING) {
            socket.emit('get player hand deck', roomID, nameID, function(dck) {
                //TODO change placement so not stacked on top of each other
                cardHand = [];
                score = 0;
                canHit = true;
                isReadyNextRound = false;
                document.getElementById("cardArea").innerHTML = "";

                var co = 0;
                dck.forEach(function(crd) {
                    setTimeout(function() {
                        addDraggableCard(crd);
                        addedCard(crd);
                    }, co*300);
                    co++;
                });

                $('#bj_display_players_button').css("display", "block");
                $('#blackjack_buttons').removeClass("fadeOut");
                $('#blackjack_buttons').css("display", "block");
                $('#bj_waiting_text').css("display", "none");
                $('#bj_busted_text').css('display', 'none');
                $('#bj_results_display').css('display','none');
                $('#bj_playing').css('display','block');
            });

        } else if (gamestate == BJ_STATE.RESULTS) {
            $('#bj_display_players_button').css("display", "none");
            $('#blackjack_buttons').removeClass("fadeOut");
            $('#blackjack_buttons').css("display", "none");
            $('#bj_waiting_text').css("display", "none");
            $('#bj_busted_text').css('display', 'none');
            $('#bj_playing').css('display','none');

            displayResults();
        }
    });

    var score = 0;

    var canHit = true;
    var isReadyNextRound = false;

    function showSettings(){
        $('#bj_rules_button').fadeOut(400);
        $('#bj_player_display').fadeOut(400);
        $('#bj_settings_display').fadeIn(400, function() {
            $('#bj_display_players_button').fadeIn(400);
        });
    }

    function hideSettings() {
        $('#bj_rules_button').fadeIn(400);
        $('#bj_settings_display').fadeOut(400);
    }

    function init() {
        gamestate = BJ_STATE.PLAYING;
        $(".button-pressable").on("mousedown touchstart", function(e) {
            $(this).addClass("pressed");
        });
        $(".button-pressable").on("mouseup touchend", function(e) {
            $(this).removeClass("pressed");
        });

        $('#bj_hit_button').on('tap click', function(e) {
            hit();
        });
        $('#bj_stand_button').on('tap click', function(e) {
            stand();
        });

        $('#bj_rules_button').on('tap click', function(e) {
            showSettings();
        });

        $('#bj_settings_display_close_button').on('tap click', function(e) {
            hideSettings();
        });

        $('#bj_readyForNextRound').on('click tap', function(e) {
            e.preventDefault();
            socket.emit('bj set player next round', roomID, nameID);
            isReadyNextRound = true;
            $('#bj_readyForNextRound').css('background-color', '#40d15d');
        });

        $('#bj_leave_game_button').on('click tap', leave);

        $('#bj_end_game_button').on('click tap',endGame);


        $('#bj_display_players_button').on('tap click', displayPlayers);

        $('#bj_player_display_close_button').on("tap click", function(e) {
            $('#bj_display_players_button').css("display", "block");
            $('#bj_player_display').addClass("fadeOut");
            $('#bj_display_players_button').addClass("fadeIn");
            function handleAnimationEnd() {
                $('#bj_player_display').removeClass("fadeOut");
                $('#bj_display_players_button').removeClass("fadeIn");
                $('#bj_player_display').css("display", "none");
                $('#bj_display_players_button').css("display", "block");
                document.getElementById("bj_player_display")
                    .removeEventListener('animationend', handleAnimationEnd);
            }
            $('#bj_player_display').on('animationend', handleAnimationEnd)
        });

        socket.emit('get player hand deck', roomID, nameID, function(dck) {
            $('#cardArea').html("");
            //TODO change placement so not stacked on top of each other
            var co = 0;
            dck.forEach(function(crd) {
                setTimeout(function() {
                    addDraggableCard(crd);
                    addedCard(crd);
                }, co*300);
                co++;
            });

            $('#blackjack_buttons').css("display", "block");
            $('#blackjack_buttons').removeClass("fadeOut");
            $('#bj_display_players_button').css("display", "block");
            $('#bj_waiting_text').css("display", "none");
            $('#bj_busted_text').css('display', 'none');
            $('#bj_player_display').css("display", "none");
            $('#bj_results_display').css('display','none');
            $('#bj_settings_display').css('display','none');
            $('#bj_rules_button').css('display','block');

            $('#blackjack').css('display', 'block');
            $('#bj_playing').fadeIn(400);
        });


        socket.on('game ended', function() {
            clearAllListeners();
            $('#playerScreen').fadeOut(1000, function(){
                $('#blackjack').css('display','none');
                displayWaitingRoom();
            });
        });
    }



    function addedCard(crd) {
        cardHand.push(crd);

        var val = 0;
        switch (crd.value) {
            case "J":
            case "Q":
            case "K":
                val = 10;
                break;
            case "A":
                val = 1;
                break;
            default:
                val = parseInt(crd.value);
                break;
        }

        score += val;
        if (score > 21) bust();
    }

    function bust() {
        canHit = false;
        socket.emit('bj end turn', roomID, nameID, -1);
        displayWaitingBJ(true);
    }


    function tallyFinalScore() {
        var aceInHand = false;
        cardHand.forEach(function(c) {
            if (c.value == "A") {
                aceInHand = true;
            }
        });

        if (aceInHand) {
            if (score + 10 <= 21) score += 10;
        }
        console.log(score);

        socket.emit('bj end turn', roomID, nameID, score, function() {
            displayWaitingBJ(false);
        });
    }

    function hit() {
        if (!canHit) return;

        socket.emit('bj hit', roomID, nameID, function(crd) {
            addDraggableCard(crd);
            addedCard(crd);
        });
    }

    function stand() {
        if (!canHit) return;
        canHit = false;

        tallyFinalScore();
    }

    //displays the waiting screen after busting/standing
    function displayWaitingBJ(isBusted) {
        $('#blackjack_buttons').fadeOut(400, function() {
            $('#blackjack_buttons').css('display', 'none');


            function textAnimationEnd() {

                socket.on('bj all players ended', function() {
                    socket.removeAllListeners("bj all players ended");
                    hidePlayingArea(function(){
                        displayResults();
                    });
                });



                socket.emit('bj all players end', roomID, function(res){
                    if (res) {
                        socket.removeAllListeners("bj all players ended");
                        hidePlayingArea(function(){
                            displayResults();
                        });
                    }
                });

            }

            if (isBusted) {
                $('#bj_busted_text').css("display", "block");
                $('#bj_waiting_text').css("display", "block");
                $('#bj_busted_text').add($('#bj_waiting_text')).fadeIn(400, textAnimationEnd);
            } else {
                $('#bj_waiting_text').fadeIn(400, textAnimationEnd);
            }
        });

    }



    function hidePlayingArea(cb) {
        $('#bj_playing').fadeOut(400, function() {
            $('#bj_playing').css("display", "none");
            $('#bj_player_display').css("display", "none");
            $('#bj_display_players_button').css("display", "block");
            cb&&cb();
        });
    }

    function displayResults() {
        gamestate = BJ_STATE.RESULTS;
        $('#bj_readyForNextRound').css('background-color', '#99f473');

        socket.emit('bj get results', roomID, function(res, pl1) {
            document.getElementById("bj_results_players").innerHTML = "";

            res.winners.forEach(function(w) {
                var d1 = document.createElement("DIV");


                var n1 = document.createElement("H5");
                n1.innerHTML = w.name +((w.id==nameID)?" (You)":"")
                    + "<span style='float:right;'>"+w.bj.score+"</span>";
                n1.style.color = "#40d15d";

                d1.appendChild(n1);

                var r1 = document.createElement("DIV");
                r1.classList.add("row");

                w.handDeck.forEach(function(c) {
                   var c1 = document.createElement("DIV");
                   c1.classList.add("bj_p_card");
                   c1.classList.add("col-3");

                   var nC = document.createElement("DIV");
                   nC.classList.add("bj_display_card");

                   nC.appendChild(cardImages[c.tag].cloneNode(true));
                   c1.appendChild(nC);
                   r1.appendChild(c1);
                });

                d1.appendChild(r1);

                d1.appendChild(document.createElement("BR"));
                document.getElementById("bj_results_players").appendChild(d1);
           });

           res.losers.forEach(function(l) {
               var d1 = document.createElement("DIV");
               var n1 = document.createElement("H5");
               n1.innerHTML = l.name + ((l.id==nameID)?" (You)":"")
                   + "<span style='float:right;'>"+
                   ((l.bj.score==-1)?"Busted!":l.bj.score)+"</span>";
               if (l.bj.score==-1) n1.style.color = "red";
               d1.appendChild(n1);


               var r1 = document.createElement("DIV");
               r1.classList.add("row");

               l.handDeck.forEach(function(c) {
                   var c1 = document.createElement("DIV");
                   c1.classList.add("bj_p_card");
                   c1.classList.add("col-3");

                   var nC = document.createElement("DIV");
                   nC.classList.add("bj_display_card");

                   nC.appendChild(cardImages[c.tag].cloneNode(true));
                   c1.appendChild(nC);
                   r1.appendChild(c1);
               });

               d1.appendChild(r1);

               d1.appendChild(document.createElement("BR"));
               document.getElementById("bj_results_players").appendChild(d1);
           });


            socket.on('bj next round start', function() {
                socket.removeAllListeners("bj next round addition");
                socket.removeAllListeners("bj next round start");

                gamestate = BJ_STATE.PLAYING;

               $('#bj_results_display').fadeOut(400, function() {
                   socket.emit('get player hand deck', roomID, nameID, function(dck) {
                       //TODO change placement so not stacked on top of each other
                       cardHand = [];
                       score = 0;
                       canHit = true;
                       isReadyNextRound = false;
                       document.getElementById("cardArea").innerHTML = "";

                       var co = 0;
                       dck.forEach(function(crd) {
                           setTimeout(function() {
                               addDraggableCard(crd);
                               addedCard(crd);
                           }, co*300);
                           co++;
                       });

                       $('#bj_display_players_button').css("display", "block");
                       $('#blackjack_buttons').removeClass("fadeOut");
                       $('#blackjack_buttons').css("display", "block");
                       $('#bj_waiting_text').css("display", "none");
                       $('#bj_busted_text').css('display', 'none');
                       jQuery('#bj_playing').fadeIn(400, function() {

                       });


                   });
               });



           });

            socket.on('bj next round addition', function(numReady, tPlayers) {
                $('#bj_readyForNextRoundText').text(((isReadyNextRound)?"Ready":"Next Round?")+" " + numReady + "/" + tPlayers);
            });

            var c = 0;
            for (var pp of pl1) {
                if (pp.nextRound) c++;
            }
            $('#bj_readyForNextRoundText').text(((isReadyNextRound)?"Ready":"Next Round?")+" " + c + "/" + pl1.length);


            $('#bj_results_display').fadeIn(400);
        });
    }


    function displayPlayers() {
        socket.emit('get players', roomID, function(pl) {
            document.getElementById("bj_players").innerHTML = "";
            pl.forEach(function(p) {
                var d1 = document.createElement("DIV");
                d1.classList.add("bj_p");

                var n1 = document.createElement("H6");
                n1.classList.add("bj_p_name");
                n1.innerText = p.name + ((p.id==nameID)?" (You)":"");
                if (p.id==nameID) n1.style.bj_rules_buttonfontWeight = "800";
                d1.appendChild(n1);

                var r1 = document.createElement("DIV");
                r1.classList.add("row");



                p.handDeck.forEach(function(c) {
                    var c1 = document.createElement("DIV");
                    c1.classList.add("bj_p_card");
                    c1.classList.add("col-3");

                    var nC = document.createElement("DIV");
                    nC.classList.add("bj_display_card");

                    if (p.id == nameID || c.revealed)
                        nC.appendChild(cardImages[c.tag].cloneNode(true));
                    else
                        nC.appendChild(backCard.cloneNode(true));

                    c1.appendChild(nC);
                    r1.appendChild(c1);
                });

                d1.appendChild(r1);
                d1.appendChild(document.createElement("BR"));
                document.getElementById("bj_players").appendChild(d1);
            });


            $('#bj_display_players_button').fadeOut(400);
            $('#bj_settings_display').fadeOut(400);
            $('#bj_player_display').fadeIn(400, function() {
                $('#bj_rules_button').fadeIn(400);

            });
        });


    }

    init();
}