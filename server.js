
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/assets', express.static('assets'));


app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});


const BLACK_JACK = 0;

const BJ_STATE  = {
    PLAYING: 1,
    RESULTS: 2
};

class Room {
    constructor(roomid) {
        this.roomid = roomid;
        this.startingGame = false;
        this.gamestart = false;
        this.winner = {
            name:"",
        };
        this.gamestate = -1;
        this.player = [];
        this.gamemode = BLACK_JACK;
        this.deck = [];
    }
    addPlayer(p) {this.player.push(p);}
    getPlayerById(id) {
        for (var p of this.player) {
            if (p.id == id) return p;
        }
        return null;
    }
}

class Player {
    constructor(name, id, roomid, socket) {
        this.roomid = roomid;
        this.socket = socket;
        this.id = id;
        this.name = name;
        this.isready = false;
        this.nextRound = false;
        this.handDeck = [];
        this.deck = [];
    }
}

class Card {
    constructor(value, suit) {
        this.tag = value + "" + suit;
        this.suit = suit;
        this.value = value;
        this.revealed = true;
        //can be hidden from other players but not the player who has the card
        this.playerRevealed = true;
    }
}


class BlackJackPlayer {
    constructor() {
        this.busted = false;
        this.score = 0;
        this.stand = false;
    }
}





function getTraditionalDeck(shuffled) {
    var newDeck = [];
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
        newDeck.push(new Card(cardNum, "S"));
        newDeck.push(new Card(cardNum ,  "C"));
        newDeck.push(new Card(cardNum ,  "H"));
        newDeck.push(new Card(cardNum , "D"));
    }
    if (shuffled) {
        shuffle(newDeck);
    }
    return newDeck;
}

function shuffle(arr) {
    for (var i = 0; i < arr.length; i++) {
        var t = arr[i];
        var randN = parseInt(Math.random()*arr.length);
        arr[i] = arr[randN];
        arr[randN] = t;
    }
}



var rooms = {};


io.on('connection', function(socket) {
    console.log("connected");

    socket.emit('get room info', function(id, nid){
        if (id!="") {
            if (rooms[id] != null && rooms[id].player[nid-1] != null) {
                socket.join(id);
                rooms[id].player[nid-1].socket = socket;
                initBlackJack(rooms[id].player[nid-1], id);

                socket.emit('display current view', rooms[id].gamestart, rooms[id].gamemode, rooms[id].gamestate);
            }
        }

    });

    socket.on('disconnect', function () {
        //console.log('user disconnected');
    });


    socket.on('get random card', function(roomid, cb) {
        if (rooms[roomid]==null)return;
        cb&&cb(rooms[roomid].deck.pop());
        if (rooms[roomid].deck.length <= 5) {
            rooms[roomid].deck = rooms[roomid].deck.concat(getTraditionalDeck());
        }
    });

    socket.on('update game mode', function(roomid, m) {
        if (rooms[roomid]==null)return;
        rooms[roomid].gamemode = m;
        io.to(roomid).emit('update game mode', m);
    });

    socket.on('join room', function(roomid, name, callback){
        if (rooms[roomid]==null) {
            callback&&callback("null", 0);
            return;
        }
        if (rooms[roomid].gamestart) {
            callback&&callback("started", 0);
            return;
        }
        if (rooms[roomid].player.length > 30) {
            callback&&callback("full", 0);
            return;
        }

        var numPlayers = rooms[roomid].player.length+1;
        socket.join(roomid);
        rooms[roomid].addPlayer(new Player(name, numPlayers, roomid, socket));

        callback&&callback("success", numPlayers);
        io.to(roomid).emit("update players");
    });

    socket.on('create room', function(roomid, name, callback) {

        if (rooms[roomid]!=null) {
            callback&&callback("taken");
            return;
        }

        var ro = new Room(roomid);
        socket.join(roomid);
        ro.addPlayer(new Player(name, 1, roomid, socket));
        rooms[roomid] = ro;
        callback && callback("success");
    });

    socket.on('start game', function(roomid) {
        if (rooms[roomid]==null) return;
        if (rooms[roomid].player.length < 2) return;
        if (rooms[roomid].startingGame) return;
        rooms[roomid].startingGame = true;
        rooms[roomid].gamestart = true;


        if (rooms[roomid].gamemode == BLACK_JACK) {
            rooms[roomid].deck = getTraditionalDeck(true);
            rooms[roomid].gamestate = BJ_STATE.PLAYING;

            rooms[roomid].player.forEach(function(p) {
                var faceDown = rooms[roomid].deck.pop();
                faceDown.revealed = false; faceDown.playerRevealed = true;

                var faceUp = rooms[roomid].deck.pop();
                faceUp.revealed = true; faceUp.playerRevealed = true;

                p.handDeck.push(faceDown); p.handDeck.push(faceUp);

                if (rooms[roomid].deck.length <= 5) {
                    rooms[roomid].deck = rooms[roomid].deck.concat(getTraditionalDeck(true));
                }
                p.bj = new BlackJackPlayer();

                initBlackJack(p, roomid);
            });
        }

        io.to(roomid).emit('game start', rooms[roomid].gamemode);
    });

    socket.on('delete player', function(roomid, id, callback) {
        if (rooms[roomid]==null) return;
        var pl = rooms[roomid].player;
        if (pl.length ==1) {
            delete rooms[roomid];
            callback && callback();
            return;
        }

        for (var i = id; i < pl.length; i++) {
            rooms[roomid].player[id-1].name = pl[i].name;
            rooms[roomid].player[id-1].id = pl[i].id-1;
            rooms[roomid].player[id-1].cid = pl[i].cid;
            rooms[roomid].player[id-1].points = pl[i].points;
        }
        rooms[roomid].player.splice(pl.length-1, 1);
        io.to(roomid).emit('player leave', rooms[roomid].gamestart, id);
        callback && callback();
    });

    socket.on('get player hand deck', function(roomid, id, cb) {
        if (rooms[roomid] == null)return;
        cb&&cb(rooms[roomid].player[id-1].handDeck);
    });

    socket.on('get player deck', function(roomid, id, cb) {
        if (rooms[roomid] == null)return;
        cb&&cb(rooms[roomid].player[id-1].deck);
    });

    socket.on('change player name', function(roomid, id, n) {
        if (rooms[roomid]==null) return;
        rooms[roomid].player[id-1].name = n;
        io.to(roomid).emit("update players");
    });

    socket.on('get players', function(roomid, cb) {
        if (rooms[roomid]==null) return;
        var pl = [];
        rooms[roomid].player.forEach(function(p13) {
            pl.push({
                name: p13.name,
                id: p13.id,
                isready: p13.isready,
                nextRound: p13.nextRound,
                handDeck : p13.handDeck,
                deck : p13.deck,
                bj: p13.bj
            });
        });

        cb&&cb(pl);
        return;
    });

    socket.on('get game state', function(roomid, cb) {
        if(rooms[roomid]==null)return;
        cb&&cb(rooms[roomid].gamestate, rooms[roomid].gamemode, rooms[roomid].player.length);
    });

    socket.on('get game mode', function(roomid, cb) {
        if(rooms[roomid]==null)return;
        cb&&cb(rooms[roomid].gamemode);
    });

    socket.on('end game', function(roomid) {
        if (rooms[roomid]==null)return;
        rooms[roomid].gamestart = false;
        rooms[roomid].startingGame = false;
        for (var i = 0; i < rooms[roomid].player.length; i++) {
            rooms[roomid].player[i].handDeck = [];
            rooms[roomid].player[i].deck = [];
            rooms[roomid].player[i].isready = false;
            rooms[roomid].player[i].nextRound = false;
            if (rooms[roomid].player[i].bj) {
                rooms[roomid].player[i].bj = new BlackJackPlayer();
            }
        }
        io.to(roomid).emit('game ended');
    });


});


function initBlackJack(p, roomid) {

        p.socket.on('bj set player next round', function(roomid, id) {
            if (rooms[roomid]==null)return;
            rooms[roomid].player[id-1].nextRound = true;

            var a = true;
            var c = 0;
            for (var pa of rooms[roomid].player) {
                if (!pa.nextRound) a = false;
                else c++;
            }
            io.to(roomid).emit('bj next round addition', c, rooms[roomid].player.length);
            if (a) {
                startNewBJRound();
                io.to(roomid).emit('bj next round start');
            }

        });

        function startNewBJRound() {
            rooms[roomid].player.forEach(function(p3) {
                p3.bj.score = 0;
                p3.bj.busted = false;
                p3.bj.stand = false;
                p3.nextRound = false;
                p3.handDeck = [];

                var faceDown = rooms[roomid].deck.pop();
                faceDown.revealed = false; faceDown.playerRevealed = true;

                var faceUp = rooms[roomid].deck.pop();
                faceUp.revealed = true; faceUp.playerRevealed = true;

                p3.handDeck.push(faceDown); p3.handDeck.push(faceUp);

                if (rooms[roomid].deck.length <= 5) {
                    rooms[roomid].deck = rooms[roomid].deck.concat(getTraditionalDeck(true));
                }
            });

            rooms[roomid].gamestate = BJ_STATE.PLAYING;
        }

        p.socket.on('bj hit', function(roomid, id, cb) {
            if (rooms[roomid]==null)return;

            var crd = rooms[roomid].deck.pop();
            rooms[roomid].player[id-1].handDeck.push(crd);


            if (rooms[roomid].deck.length <= 5) {
                rooms[roomid].deck = rooms[roomid].deck.concat(getTraditionalDeck(true));
            }
            cb&&cb(crd);
        });

        p.socket.on('bj end turn', function(roomid, id, score, cb) {
            if (rooms[roomid]==null)return;
            if (score==-1) rooms[roomid].player[id-1].bj.busted = true;
            rooms[roomid].player[id-1].bj.score = score;
            rooms[roomid].player[id-1].bj.stand = true;


            if (checkPlayersEnd()) {
                rooms[roomid].gamestate = BJ_STATE.RESULTS;
                io.to(roomid).emit("bj all players ended");
            }
            cb&&cb();
        });

        p.socket.on('bj all players end', function(roomid, cb) {
            if (rooms[roomid] == null) return;
            cb&&cb(checkPlayersEnd());
        });

        function checkPlayersEnd() {
            for (var i = 0; i < rooms[roomid].player.length; i++) {
                if (!rooms[roomid].player[i].bj.stand) {
                    return false;
                }
            }
            return true;
        }

        p.socket.on('bj get results', function(roomid, cb) {
            if (rooms[roomid]==null)return;

            var players = [];
            rooms[roomid].player.forEach(function(p13) {
               players.push({
                   name: p13.name,
                   id: p13.id,
                   isready: p13.isready,
                   nextRound: p13.nextRound,
                   handDeck : p13.handDeck,
                   deck : p13.deck,
                   bj: p13.bj
               });
            });


            var winners = [];
            var losers =[];

            var idx = [];
            var maxVal = 0;

            var i = 0;
            players.forEach(function(p1) {
                var val = p1.bj.score;
                if (val > maxVal) {
                    maxVal = val;
                    idx = [];
                    idx.push(i);
                } else if (val == maxVal) {
                    idx.push(i);
                }
                i++;
            });

            for (var j = 0; j < players.length; j++) {
                if (idx.includes(j)) winners.push(players[j]);
                else losers.push(players[j]);


            }

            cb&&cb({
                winners: winners,
                losers: losers
            }, players);

        })
}



http.listen(8000, function(){
    console.log('listening on *:8000');
});
