/** Webservices for Stbs - HTTP handler
*
* Handles JSON RPC requests over HTTP + SSE interface and a WebSocket interface
*
* 2015 - Wouter van Boesschoten
*/

var http = require('http');
var url = require('url');
var util = require('util');
var log4js = require('log4js');
var WebSocketServer = require('websocket').server;

var eventsBus;
var log = log4js.getLogger('http');

function validateJsonRpc(obj){
    if (!obj.method || !obj.jsonrpc || !obj.id){
        return false;
    }

    return true;
}

function parseJson(data){
    var responseObj;

    try {
        responseObj = JSON.parse(data);
    } catch (e){
        log.debug('Error parsing json.');
    }

    return responseObj;
}

/* Handles a HTTP request on the RPC interface. Parses the query or body for JSON RPC request messages.
*
* @param req {object} The HTTP incomming request object
* @param res {object} The HTTP response object
*/
function handleRpcRequest(req, res){
    var data;
    var reqObject;

    req.on('data', function(chunk){
        data += chunk;
    });

    req.on('end', function(){
        parseData();
    });

    function parseData(){
        var reqObject;
        var error;
        var parsedUrl = url.parse(req.url, false);

        if (data){
            reqObject = parseJson(data);
        } else {
            //try URL
            reqObject = parseJson(decodeURIComponent(parsedUrl.query));
        }

        //clear the data object
        data=undefined;                                

        if (!reqObject){
            error = {"jsonrpc": "2.0", "error": {"code": 400, "message": "Bad request"}, "id": null};
            res.writeHead(400);
            res.end(JSON.stringify(error));
            return;
        }

        var validJsonRpcRequest = validateJsonRpc(reqObject);

        if (!validateJsonRpc){
            log.error('Provided json object is not JSON RPC 2.0 compliant: ' + JSON.stringify(reqObject));
            error = {"jsonrpc": "2.0", "error": {"code": 400, "message": "Object is not JSON RPC 2.0 compliant"}, "id": null};
            res.writeHead(400);
            res.end(JSON.stringify(error));
            return;
        }
        
        eventsBus.emit('request', reqObject);
        res.writeHead(200);
        res.end();
    }
}

/* handles the websocket connection (after it has been accepted), parses any messages the come in and provide binding for async responses
*
* @param socket {Object} The websocket connection object. See: https://github.com/theturtle32/WebSocket-Node/blob/master/docs/WebSocketConnection.md
*/

function handleWebSocket(socket){
    function _sendWebSocket(responseObject){
        var message = JSON.stringify(responseObject);
        log.debug('Sending websocket async message: ' + message);
        socket.send(message + '\n');
    }

    log.debug('Client succesfully upgraded to a websocket connection');
  
    eventsBus.on('response', _sendWebSocket);

    socket.on('message', function(message){
        if (message.type == 'utf8'){
             parseData(message.utf8Data);
        }
    });

    socket.on('close', function(){
        eventsBus.removeListener('response', _sendWebSocket);
    });

    socket.on('error', function(){
       eventsBus.removeListener('response', _sendWebSocket); 
    });


    function parseData(message){
        var reqObject;

        reqObject = parseJson(message);

        if (!reqObject){
            log.error('Error parsing JSON request');
            error = {"jsonrpc": "2.0", "error": {"code": 400, "message": "Bad request"}, "id": null};
            socket.send(JSON.stringify(error));
            return;
        }

        var validJsonRpcRequest = validateJsonRpc(reqObject);

        if (!validateJsonRpc){
            log.error('Provided json object is not JSON RPC 2.0 compliant: ' + JSON.stringify(reqObject));
            error = {"jsonrpc": "2.0", "error": {"code": 400, "message": "Object is not JSON RPC 2.0 compliant"}, "id": null};
            socket.send(JSON.stringify(error));
        }
        
        eventsBus.emit('request', reqObject);
    }
}

/* Handles the Server Sent Event connection requests and sets up bindings for async events.
 * 
 * @param {Object} req - HTTP incomming request object
 * @param {Object} res - HTTP Response object
 */

function handleSSEConnect(req, res){
    //server sent event request, async events back to the app
    req.socket.setTimeout(0);

    //return head
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Server': 'Node v' + process.versions.node + ' Chrome V8 v' + process.versions.v8
    });

    function constructSSE(responseObject){
        var SSE = '';

        SSE+='id: ' + responseObject.id + '\n';
        SSE+='data: ' + JSON.stringify(responseObject) + '\n';
        SSE+='\n'; // Note the extra newline, to end the event

        return SSE;
    } 

    function _sendSSE(responseObject){
        var message = constructSSE(responseObject);
        log.debug('Sending SSE: ' + message);
        res.write(message);           
    }

    //subscribe to global newNotification event         
    eventsBus.on('response', _sendSSE); 

    req.on('close', function(){
        eventsBus.removeListener('response', _sendSSE);
    });

    req.on('error', function(){
        eventsBus.removeListener('response', _sendSSE);
    });

    res.write('\r\n');

    log.debug('SSE ready');
}

/*
* Public function that starts the HTTP & WebSocket service
*/
exports.startHttp = function(events, options){
    /** init **/
    eventsBus = events;

    if (!options && !options.port) {
        options.port = 8080;
    }

    /*
    * HTTP RPC interface + Server Sent Events
    */ 
    var server = http.createServer(); 
    server.on('request', function(req, res) {
        log.info("HTTP Client request: " + req.connection.remoteAddress + ':' + req.connection.remotePort + ' @ ' + req.method + ' ' + req.url);

        var parsedUrl = url.parse(req.url, false);

        /** Supported paths and their mapping to objects
        * Anything not in this array will return a 404 not found
        */
        var pathMapping = {
            '/rpc' : handleRpcRequest,
            '/server-sent-events' : handleSSEConnect
        };

        var handler = pathMapping[parsedUrl.pathname];

        if (!handler) res.end(404);
        handler(req, res);

    });

    server.listen(options.port);
    log.info('WSAP HTTP listening on port %s', options.port);

    /*
    * Websocket
    */
    var ws = new WebSocketServer();
    ws.mount({ httpServer: server });
    ws.on('request', function(websocketRequest) { 

        log.info("WebSocket Client request: " + websocketRequest.remoteAddress + ' @ ' + websocketRequest.resource + '  websocket version:' + websocketRequest.webSocketVersion);
        //accept everything for now...
        wsConnection = websocketRequest.accept();
        handleWebSocket(wsConnection);
    });
    log.info('WSAP WebSocket server started');
};