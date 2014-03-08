var mcauth = require("mcauth"),
	config = require("./config.js"),
	users = require("./users.js"),
	friends = require("./friends.js");

var Packets = {};

var PACKET_DATA = [
	{username: "STRING", sessionID: "STRING"},//Packet 0: Login.
	{message: "STRING"},//Packet 1: Disconnect
	{friendName: "STRING", message: "STRING"},//Packet 2: Add Friend
	{username: "STRING"}//Packet 3: Player Not Found
];

Packets.sendPacket = function(socket, packetID, packet) {
	var finalBuff = new Buffer(8),
		dataBuff = new Buffer(0);
	finalBuff.writeUInt32BE(packetID, 0);
	for(var type in PACKET_DATA[packetID]) {
		var buff = new Buffer(0);
		if(PACKET_DATA[packetID][type] == "STRING"){
			var value = packet[type],
				len = Buffer.byteLength(value, "utf8");
			buff = new Buffer(len + 2);
			buff.writeUInt16BE(len, 0);
			buff.write(value, 2, "utf8");
		}
		dataBuff = Buffer.concat([dataBuff, buff]);
	}
	finalBuff.writeUInt32BE(dataBuff.length, 4);
	finalBuff = Buffer.concat([finalBuff, dataBuff]);
	socket.write(finalBuff);
};

Packets.sendDisconnect = function(socket, message) {
	console.log("Disconnected "+socket.username+" ("+socket.remoteAddress+") for reason: "+message);
	var disconnect = {};
	disconnect.message = message;
	Packets.sendPacket(socket, 1, disconnect);
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
	if(!socket.isAuthed) {//Don't accept any packets until we know who this is
		if(packet.pID === 0){//Packet 0: Login
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
		} else {
			Packets.sendDisconnect(socket, "Tried to send packet before authorizing.");
		}
	} else {
		switch(packet.pID){
			case 2://Packet 2: Add Friend
				friends.addFriend(socket, packet.friendName, packet.message, function (name) {
					var notFound = {};
					notFound.username = name;
					Packets.sendPacket(socket, 3, notFound);
				});
				break;
		}
	}
};

module.exports = Packets;