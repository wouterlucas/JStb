/** Webservices APi 4 Stbs (WSAP)
 * 
 * Main module, initializes interface and dispatches.
 * Once a message is received looks for the appropriate handler/module and provides async response bus for all modules
 *
 * Author: Wouter van Boesschoten
*/
var httpServer = require('./modules/http.js');
var player = require('./modules/player.js');
var log4js = require('log4js');
var events = require('events');

/** Logging **/
var log = log4js.getLogger('main');
log.setLevel('DEBUG');

//Settings
var options = {
    port : 8080, //WSAP port
    debug : true, //run in debug mode
};

//Make sure we do not bailout on an exception
if (!options.debug){
    process.on('uncaughtException', function (err) {
      console.error(err.stack);
      console.log("WebServices API is NOT Exiting...");
    });
}

//our events
var eventsBus = new events.EventEmitter();
eventsBus.setMaxListeners(0);

/* start our modules */
httpServer.startHttp(eventsBus, options);
player.startPlayerInterface(eventsBus);