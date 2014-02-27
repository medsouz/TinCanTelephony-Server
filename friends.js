//Setup SQLite Table
db.run("create table if not exists friends(id INTEGER PRIMARY KEY, senderID INTEGER, receiverID INTEGER, message TEXT, accepted BOOLEAN, timestamp DATETIME)");

var users = require("./users.js");

var Friends = {};

Friends.getFriendConnection = function (userA, userB, callback) {
	users.getID(userA, function (idA) {
		if(idA != -1) {
			users.getID(userB, function (idB) {
				if(idB != -1) {
					db.get("SELECT * FROM friends WHERE (senderID = ?1 AND receiverID = ?2) OR (senderID = ?2 AND receiverID = ?1)", idA, idB, function(err, row) {
						if(!err) {
							callback(row);
						}
					});
				}
			});
		}
	});
}

Friends.addFriend = function(user, friend) {
	
}

module.exports = Friends;