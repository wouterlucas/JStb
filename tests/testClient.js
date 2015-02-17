/** Webservices APi for Stbs (WSAP)
 * 
 *  Test client
 *
 * Author: Wouter van Boesschoten
*/

var net = require('net');
var promptly = require('promptly');
var http = require('http');
var WebSocketClient = require('websocket').client;

var connType;
var host;
var port;
var sseHandler;
var ws; //websocket
var wsHandler;
var id = 0;

/*** functions ***/
function connect(callback){
    if (connType == 'h'){
        console.log('Connecting to the SSE interface');
        var options = {
          hostname: host,
          port: port,
          path: '/server-sent-events',
          method: 'GET'
        };

        sseHandler = http.request(options, function(res) {
            console.log('Succesfull connected to the SSE interface');
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                if (chunk != '\r\n'){
                    console.log('RESPONSE   SSE     : ' + chunk);
                }
            });
            callback();
        });

        sseHandler.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });

        sseHandler.end();
    }

    if (connType == 'w'){
        console.log('Connecting to the websocket interface');

        ws = new WebSocketClient();
        ws.connect('ws://' + host + ':' + port + '/', null, null, null, null);
        ws.on('connect', function(wsConnection){
            console.log('Succesfully connected to the websocket server');
            wsHandler = wsConnection;
            callback();
        });

        ws.on('connectFailed', function(error){
            console.log('problem with the websocket connection: ' + error);
        });
    }
}

function createPlayer(){
    var createPlayerRequest = {
        jsonrpc : '2.0',
        id : id++,
        method : 'players.createPlayer',
        params : {
            source: {
                type: 'ip',
                protocol: 'hls',
                url: 'http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4'
            },
            transcoding: {}, //not yet supported
            destination: {
                type: 'display'
            },
            player: {
                rate: 1, //float
            }
        }
    };


    if (connType == 'h'){
        //send get request
        http.get('http://' + host + ':' + port + '/rpc?' + JSON.stringify(createPlayerRequest), function(res) {
            console.log("Got response: " + res.statusCode);
            mainMenu();
        }).on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    }

    if (connType == 'w'){
        wsHandler.send(JSON.stringify(createPlayerRequest));
        mainMenu();
    }
}


/** prompts **/ 
function mainMenu(){
    var tcOptions = ['0', '1', '2', '3'];

    var tcMapping = {
        '0' : createPlayer 
    };

    var menuString = '\n ------ Menu -----\n' +
                    '   [0] Create Player \n' +
                    '\n' +
                    'Choose command: ';


    promptly.choose(menuString, tcOptions, function (err, value) {
        var handler = tcMapping[value];

        if (handler) {
            handler();
        }
    });

}


promptly.prompt('IP [localhost]: ', { default : 'localhost'}, function (err, value) {
    // err is always null in this case, because no validators are set
    host = value;

    promptly.prompt('Port [8080]: ', { default : '8080'}, function (err, value) {
        // err is always null in this case, because no validators are set
        port = value;

        promptly.choose('Do you want to start an HTTP (h) or WebSocket (w) session [h]:', ['h', 'w'], { default : 'h' }, function (err, value) {
            connType = value;
            connect(function(){
                mainMenu();
            });
        });
    });    
});

