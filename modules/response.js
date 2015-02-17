/** Webservices for Stbs - response handler
*
* Generates JSON RPC responses
*
* 2015 - Wouter van Boesschoten
*/

var log4js = require('log4js');
var log = log4js.getLogger('responses');
var events;

/*
* Public that generates a JSON RPC error response object
*/

exports.Error = function(id, code, message){
    if ((!code) || (!message)) { return false; }
    if (id === undefined) { id=null; }

    var jsonResponse = {
        'jsonrpc' :     '2.0',
        'error' : {
            code : code,
            message : message
        },
        'id' :          id
    };

    log.debug('Sending error response with id: ' + id + ' code: ' + code + ' message: ' + message);

    eventsBus.emit('response', jsonResponse);
    return true;
};

/*
* Public that generates a JSON rpc response object
*/
exports.Response = function(id, resultObj){
    if ((id === undefined) || (resultObj == undefined)) { return false; }

    var jsonResponse = {
        'jsonrpc' :     '2.0',
        'result' :      resultObj,
        'id' :          id
    };

    log.debug('Sending response with id: ' + id);

    eventsBus.emit('response', jsonResponse);
    return true;
    
};

exports.init = function(events){
    eventsBus = events;

    log.info('Response module initialized');
}