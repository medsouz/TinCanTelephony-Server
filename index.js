var net = require("net"),
	packets = require("./packets.js"),
	config = require("./config.js");

function processBuffer(c, isNested){
	for(x = 0; x < c.buffer.length; x++){//only parse packet if the end (\r\n) has been recieved
		if(c.buffer[x] == 0x0D && x < c.buffer.length - 1 && c.buffer[x + 1] == 0x0A){
			packets.parse(c, c.buffer);
			c.buffer = c.buffer.slice(x + 2, c.buffer.length);//remove parsed stuff from buffer.
			if(!isNested){
				processBuffer(c, true);//Try to parse remaining data
			}
		}
	}
}

var server = net.createServer(function(c) { //'connection' listener
	console.log("Got connection from " + c.remoteAddress);
	//Set up socket
	c.username = "N/A";
	c.isAuthed = false;
	c.authTimeout = setTimeout(function(c){//give client one minute to auth with server.
		if(!c.isAuthed){
			if(!c.destroyed){//You can't kill whats already dead
				packets.sendDisconnect(c, "Failed to auth before timeout.");
			}
		}
	}, 60000, c);
	c.buffer = new Buffer(0);
	c.on("data", function(data) {
		c.buffer = Buffer.concat([c.buffer, data]);//cache buffer in case it got split up by TCP's sorcery
		processBuffer(c, false);
	});
	c.on("error", function(){
		console.log("Client connection closed.");
		if(!c.destroyed){//You can't kill whats already dead
			packets.sendDisconnect(c, "Error");
		}
	});
	c.on("end", function() {
		console.log("client disconnected");
	});
});
server.listen(config.port, config.host, function() {
	console.log("TinCanTelephony Server started on port 9999");
});