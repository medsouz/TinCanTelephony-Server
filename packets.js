var mcauth = require("mcauth"),
	config = require("./config.js"),
	users = require("./users.js"),
	friends = require("./friends.js");

var Packets = {};

var PACKET_DATA = [
	{username: "STRING", sessionID: "STRING"},//Packet 0: Login.
	{message: "STRING"},//Packet 1: Disconnect
	{friendName: "STRING"}//Packet 2: Add Friend
];

Packets.sendDisconnect = function(socket, message) {
	var len = Buffer.byteLength(message, 'utf8'),
		buff = new Buffer(len + 10);
	buff.writeUInt32BE(1, 0);
	buff.writeUInt32BE(buff.length, 4);
	buff.writeUInt16BE(len, 8);
	buff.write(message, 10, "utf8");
	console.log("Disconnected "+socket.username+" ("+socket.remoteAddress+") for reason: "+message);
	socket.write(buff);
	socket.destroy();
};

Packets.parse = function(socket, data) {
	var packet = {},
		off = 0;
	try {
		packet.pID = data.readInt32BE(off);
		off += 4;
		off += 4;//HACK: Skip over byte array length provided by java
		for(var type in PACKET_DATA[packet.pID]){
			if(PACKET_DATA[packet.pID][type] == "STRING"){
				var strlen = data.readUInt16BE(off);
				off += 2;
				packet[type] = data.toString('utf8', off, off + strlen);
				off += strlen;
			}
			if(PACKET_DATA[packet.pID][type] == "INT"){
				packet[type] = data.readInt32BE(off);
				off += 4;
			}
		}
	} catch(err) {
		console.log("Connection threw " + err);
		Packets.sendDisconnect(socket, "Caused an error! :(");
	}
	console.log("Recieved Packet #"+packet.pID+" from "+socket.username+" ("+socket.remoteAddress+")");
	if(config.verbose) {
		console.log(packet);
	}
	switch(packet.pID){
		case 0://Packet 0: Login
			socket.username = packet.username;
			mcauth.isNameValid(packet.username, function (nameValid) {
				if(nameValid) {
					mcauth.checkSessionId(packet.username, packet.sessionID, function (sessionValid) {
						if(sessionValid || config.noAuth){
							socket.isAuthed = true;
							clearTimeout(socket.authTimeout);
							users.login(socket);
						}else{
							Packets.sendDisconnect(socket, "Invalid login!");
						}
					});
				} else {
					Packets.sendDisconnect(socket, "Invalid username!");
				}
			});
			break;
		case 2://Packet 2: Add Friend
			break;
	}
};

module.exports = Packets;