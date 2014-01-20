Packets = {};

PACKETS = [
	{Username: "STRING", SessionID: "STRING"}//Packet 0: Login.
];

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
		socket.end("Caused an error! :(\r\n");
	}
	console.log(packet);
}

module.exports = Packets;