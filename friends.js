//Setup SQLite Table
db.run("create table if not exists friends(senderID INTEGER, receiverID INTEGER, message TEXT, accepted BOOLEAN, timestamp DATETIME)");

var users = require("./users.js"),
	moment = require("moment");

var Friends = {};

Friends.getFriendConnection = function (userA, userB, callback) {
	users.getID(userA, function (idA) {
		if(idA != -1) {
			users.getID(userB, function (idB) {
				if(idB != -1) {
					db.get("SELECT *, (SELECT COUNT(*) FROM friends WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)) AS id FROM friends", idA, idB, function(err, row) {
						if(!err) {
							callback(row);
						} else {
							console.log(err);
						}
					});
				}
			});
		}
	});
}

Friends.addFriend = function(socket, friend, message, callback) {
	users.getID(socket.username, function (idA) {
		if(idA != -1) {
			users.getID(friend, function (idB) {
				if(idB != -1) {
					Friends.getFriendConnection(socket.username, friend, function (row) {//check to see if a friend request has already been sent to make this connection
						if(row) {//if a connection already exists...
							if(idA == row.receiverID && idB == row.senderID){//The friend is accepting! If this is false then someone tried to resend a friend request
								db.run("UPDATE friends SET accepted = ?3 WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)", idA, idB, 1);
							} else {
								console.log(socket.username + " tried to accept a friend request he sent...");
							}
						} else {//no connection
							db.run("INSERT INTO friends VALUES (?, ?, ?, 0, ?)", idA, idB, message, moment().format("YY-MM-DD HH:mm:SS"));
						}
					});
				} else {
					console.log("Player " + friend + " not found in DB!");
					callback(friend);
				}
			});
		}
	});
}

module.exports = Friends;