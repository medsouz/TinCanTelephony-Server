var mcauth = require("mcauth"),
	users = require("./users.js"),
	friends = require("./friends.js"),
	util = require('util');

var Packets = {};

var PACKET_DATA = [
	{username: "STRING", sessionID: "STRING"},//Packet 0: Login.
	{message: "STRING"},//Packet 1: Disconnect
	{friendName: "STRING", message: "STRING"},//Packet 2: Add Friend
	{username: "STRING"},//Packet 3: Player Not Found
	{friends: [{name: "STRING", status: "STRING"}]},//Packet 4: Friend List
	{dataType: "STRING"},//Packet 5: Request Data
	{invitePublic: "BOOLEAN", messagePublic: "BOOLEAN", serverPublic: "BOOLEAN"}//Packet 6: Settings
];

function writeToBuffer(dataType, data) {
	var dataBuff = new Buffer(0);
	for(var type in dataType) {
		var buff = new Buffer(0);
		if(dataType[type] == "STRING"){
			var value = data[type],
				len = Buffer.byteLength(value, "utf8");
			buff = new Buffer(len + 2);
			buff.writeUInt16BE(len, 0);
			buff.write(value, 2, "utf8");
		} else if(dataType[type] == "INT"){
			buff = new Buffer(4);
			buff.writeUInt32BE(data[type], 0);
		} else if(dataType[type] == "BOOLEAN"){
			buff = new Buffer(1);
			buff[0] = (data[type]) ? 1 : 0;
		} else if(util.isArray(dataType[type])) {
			buff = new Buffer(4);
			buff.writeUInt32BE(data[type].length, 0);
			for(var index = 0; index < data[type].length; index++) {
				var arrBuff = writeToBuffer(dataType[type][0], data[type][index]);
				buff = Buffer.concat([buff, arrBuff]);
			}
		}
		dataBuff = Buffer.concat([dataBuff, buff]);
	}
	return dataBuff;
}

Packets.sendPacket = function(socket, packetID, packet) {
	var finalBuff = new Buffer(8),
		dataBuff = writeToBuffer(PACKET_DATA[packetID], packet);
	finalBuff.writeUInt32BE(packetID, 0);
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
			} else if(PACKET_DATA[packet.pID][type] == "INT"){
				packet[type] = data.readInt32BE(off);
				off += 4;
			} else if(PACKET_DATA[packet.pID][type] == "BOOLEAN"){
				packet[type] = (data[off] == 1) ? true : false;
				off += 1;
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
			case 5:
				if(packet.dataType == "FRIENDS") {
					friends.getFriends(socket.userID, function(friendList){
						Packets.sendPacket(socket, 4, friendList);
					});
				}
				break;
			case 6:
				users.updateSettings(socket.userID, packet);
				break;
		}
	}
};

module.exports = Packets;