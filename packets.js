var mcauth = require("mcauth");

var Packets = {};

var PACKET_DATA = [
	{Username: "STRING", SessionID: "STRING"}//Packet 0: Login.
];

Packets.sendDisconnect = function(socket, message) {
	var len = Buffer.byteLength(message, 'utf8'),
		buff = new Buffer(len + 10);
	buff.writeUInt32BE(1, 0);
	buff.writeUInt32BE(buff.length, 4);
	buff.writeUInt16BE(len, 8);
	buff.write(message, 10, "utf8");
	socket.write(buff);
	socket.destroy();
};

Packets.parse = function(socket, data) {
	var packet = {};
	var off = 0;
	try {
		packet.pID = data.readInt32BE(off);
		off += 4;
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
	switch(packet.pID){
		case 0:
			mcauth.checkSessionId(packet.Username, packet.SessionID, function(valid){
				if(valid){
					socket.username = packet.Username;
					socket.isAuthed = true;
					clearTimeout(socket.authTimeout);
				}else{
					Packets.sendDisconnect(socket, "Invalid login!");
				}
			});
			break;
	}
};

module.exports = Packets;