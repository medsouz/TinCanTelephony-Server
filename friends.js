//Setup SQLite Table
db.run("create table if not exists friends(senderID INTEGER, receiverID INTEGER, message TEXT, accepted BOOLEAN, timestamp DATETIME)");

var moment = require("moment");

var Friends = {};

Friends.getFriendConnection = function (idA, idB, callback) {
	//db.get("SELECT *, (SELECT COUNT(*) FROM friends WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)) AS id FROM friends", idA, idB, function(err, row) {
	db.get("SELECT * FROM friends WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)", idA, idB, function(err, row) {
		if(!err) {
			callback(row);
		} else {
			console.log(err);
		}
	});
}

Friends.addFriend = function(socket, friend, message, callback) {//callback is called if the "friend" hasn't used TCT yet.
	users.getID(friend, function (idB) {
		if(idB != -1) {
			Friends.getFriendConnection(socket.userID, idB, function (row) {//check to see if a friend request has already been sent to make this connection
				if(row) {//if a connection already exists...
					if(socket.userID == row.receiverID && idB == row.senderID) {//The friend is accepting! If this is false then someone tried to resend a friend request
						db.run("UPDATE friends SET accepted = ?3 WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)", socket.userID, idB, 1);
					} else {
						console.log(socket.username + " tried to accept a friend request he sent...");
					}
				} else {//no connection
					db.run("INSERT INTO friends VALUES (?, ?, ?, 0, ?)", socket.userID, idB, message, moment().format("YY-MM-DD HH:mm:SS"));
				}
			});
		} else {
			console.log("Player " + friend + " not found in DB!");//by not allowing unregistered users to be stored as friends we will lower the amount of clutter from mispelled names in the database
			callback(friend);
		}
	});
}

Friends.getFriends = function(userID, callback) {
	var friendList = {},
		index = 0;
	friendList.friends = [];
	db.each("SELECT * FROM users WHERE id IN (SELECT senderID AS ID FROM friends WHERE receiverID = ?1 UNION SELECT receiverID AS ID FROM friends WHERE senderID = ?1)", userID, function(err, row) {
		friendList.friends[index] = {};
		friendList.friends[index].name = row.username;
		friendList.friends[index].status = "Debugging TCT";
		index++;
		users.refresh(row.uuid);
	}, function(){ //called when completed
		callback(friendList);
	});
}

module.exports = Friends;