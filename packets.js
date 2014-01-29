var mcauth = require("mcauth");

Packets = {};

PACKETS = [
	{Username: "STRING", SessionID: "STRING"}//Packet 0: Login.
];

Packets.sendDisconnect = function(socket, message) {
	len = Buffer.byteLength(message, 'utf8');
	buff = new Buffer(len + 10);
	buff.writeUInt32BE(1, 0);
	buff.writeUInt32BE(buff.length, 4);
	buff.writeUInt16BE(len, 8);
	buff.write(message, 10, "utf8");
	socket.write(buff);
	socket.destroy();
}

Packets.parse = function(socket, data) {
	packet = {};
	off = 0;
	console.log(data);
	try {
		packet.pID = data.readInt32BE(off);
		off += 4;
		for(type in PACKETS[packet.pID]){
			if(PACKETS[packet.pID][type] == "STRING"){
				strlen = data.readUInt16BE(off);
				off += 2;
				packet[type] = data.toString('utf8', off, off + strlen);
				off += strlen;
			}
			if(PACKETS[packet.pID][type] == "INT"){
				packet[type] = data.readInt32BE(off);
				off += 4;
			}
		}
	} catch(err) {
		console.log("Connection threw " + err);
		Packets.sendDisconnect(socket, "Caused an error! :(");
	}
	console.log(packet);
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
}

module.exports = Packets;