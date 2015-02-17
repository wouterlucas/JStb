/** Webservices APi 4 Stbs (WSAP)
 * 
 * Player module, handles player state and player requests
 *
 * Author: Wouter van Boesschoten
*/
var log4js = require('log4js');
var log = log4js.getLogger('player');
var gstreamer = require('../node-gstreamer-superficial/build/Release/gstreamer-superficial');
var re = require('./response.js');

var eventsBus;
var players = [];


/*
 * Player class
 */
function Player(idx){
    var plCreated =     0;
    var plPlaying =     1;
    var plStopped =     2;
    var plError =       -1;
    var playerState =   plCreated;
    var playerIdx =     idx;
    var rate =          0;
    var position =      0;
    var url;
    var pipeline;

    this.getPlayerIdx = function(){
        return playerIdx;
    }

    this.getPosition = function(){
        return position;
    }

    this.getRate = function(){
        return rate;
    }

    this.getUrl = function(){
        return url;
    }


    this.play = function(newUrl){
        url = newUrl;
    
        pipeline = new gstreamer.Pipeline("videotestsrc ! autovideosink");
        pipeline.play();
    }

    this.changeRate = function(newRate){
        /** bind here **/
        rate = newRate;
    }

    this.pause = function(){
        if (pipeline){
            pipeline.pause();
        }

        rate = 0;
    }

    this.jumpToPosition = function(newPosition){
        /** bind here **/
        position = newPosition;
    }

    this.stop = function(){
        if (pipeline){
            pipeline.stop();
        }

        playerState = plStopped;
    }
}

function createPlayer(request){
    log.debug('request: ' + JSON.stringify(request));

    var params = request.params;

    //validate request first
    if (params.source === undefined || params.source.url === undefined || params.source.url == ''){
        log.error('Source object or url not found');
        re.Error(request.id, 401, 'Source or url not found');
        return;
    }

    log.debug('Creating player');

    var playerObj = new Player(players.length);
    players.push(player);

    log.debug('Sending play');
    //play it
    playerObj.play(params.source.url);

    var player = {
        id : playerObj.getPlayerIdx(),
        status : 200
    };

    log.debug('Sending response');

    re.Response(request.id, player);
}

function updatePlayer(request){

}

function destroyPlayer(request){
    if (!request.player && !request.player.id){
        return;
    }

    var player = players[request.player.id];

    if (player){
        player.stop();
        players.splice(request.player.id, 1);
    }

    re.Respond(request.id, 200);
}

/* our methods */
var methods = {
    'players.createPlayer' : createPlayer,
    'players.updatePlayer' : updatePlayer,
    'players.destroyPlayer' : destroyPlayer
}

exports.startPlayerInterface = function(events){
    eventsBus = events;

    re.init(eventsBus);
    
    eventsBus.on('request', function(request){
        var handler = methods[ request.method ];

        if (handler){
            log.debug('Player handler found, handling request');

            handler(request);
        }
    });

    log.info('Player interface initialized');
};