Node Javascript API for Stbs

# Introduction 
The JStb API for STBs provides a HTTP/JSON API for management of functionality on the Settop box.
Often embedded functions are written C/CPP, which is great. However with modern application environments 
those C/CPP functions can be harder to reach. Especially from a web browser, android app or other device
within the network.

The  interface principles:
	JSONRPC 2.0 


	HTTP GET/PUT/POST where the JSON is in the URL or Body
	Async messages through Server Sent Events (SSE's)

	Or: WebSockets for Control & Response


# Interface specification

## Player
method: Player;
actions: ['CreatePlayer'|'UpdatePlayer'|'DestroyPlayer'];

### Create player

**Request**
'''method: player.createPlayer
Params {
	source: {
		type : 'ip'
		protocol: 'hls'|'http'
		url : 'http://a/b.m3u8'
	},
	transcoding : {}, //not yet supported
	destination: {
		type : 'display'|'record'
		format : 'hls'
		contentProtection : '' //not supported
	},
	player : {
		rate: 1, //float
	}
}'''

**Response** 
note this may be repeated as the player state changes over time as a notification without jsonrpc:id

'''Result: {
	Player : {
		id : 0, //player Id
		status : '200', //1xx for init, 2xx for OK, 3xx for temp errors, 4xx for well defined errors, 5xx for unkown errors
		position : 10, //in NPT
		rate : 1, //play rate
		streams: [ //array of variant streams that are from the m3u8
			{	
				streamIdx : 0, //index for reselection
				bitrate: 2500, // kb/s
				resolution: '416x234', //resolution from m3u8
				codecs: 'avc1.42e00a,mp4a.40.2' //codecs from m3u8
			}
		]
	}
}'''

### Update player

**Request** 
'''method: player.updatePlayer
Params: {
	Player : {
		id : 0, //id of the player
		position : 11, //optional, to jump in the stream
		rate : 1  //optional -2,-4 for rewind and 2,4,8 for fast foward. 0 for pause
		variantStreamIdx: 0 //optional indicates the variant stream selection for multiple streams in the m3u8 if app wants to override
	}
}'''

**Response**
See create player response

### Delete Player

**Request**
method: player.destroyPlayer
Player : {
	id : 0
}

**Response**
Result : 200;
