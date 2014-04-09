//Setup SQLite Table
db.run("create table if not exists users(id INTEGER PRIMARY KEY, username TEXT, uuid TEXT, lastCheck DATETIME)");

var Users = {},
	moment = require("moment"),
	mcauth = require("mcauth"),
	config = require("./config.js");

Users.login = function(socket) {
	db.get("SELECT * FROM users WHERE username=?", socket.username, function(err, row) {
		if(!row && !err) {//if the user isn't found and the code does not error...
			console.log("User "+socket.username+" isn't in the database, checking information...");
			mcauth.getMojangProfile(socket.username, function(profile) {
				db.run("INSERT INTO users VALUES (NULL, ?, ?, ?)", socket.username, profile.profiles[0].id, moment().format("YY-MM-DD HH:mm:SS"));
				console.log("Done! "+socket.username+" (UUID: "+profile.profiles[0].id+") has been registered");
				Users.getID(socket.username, function(id){
					socket.userID = id;
				});
			});
		} else if(err) {
			console.log(err);
		} else {
			Users.getID(socket.username, function(id){
				socket.userID = id;
			});
		}
	});
}

Users.getID = function(username, callback) {
	db.get("SELECT * FROM users WHERE username COLLATE NOCASE = ?", username, function(err, row) {
		if(row){
			callback(row.id);
		}else{
			callback(-1);
		}
	});
}

Users.refresh = function(uuid) {
	console.log("REFRESH "+uuid);
	db.get("SELECT * FROM users WHERE uuid=?", uuid, function(err, row) {
		if(row && !err) {
			if(moment().unix() - moment(row.lastCheck, "YY-MM-DD HH:mm:SS").unix() > config.accountTTL) {
				console.log("UUID "+uuid+" has exceeded it's TTL and is being refreshed...");
				mcauth.getPlayerInformation(uuid, function(info) {
					info = JSON.parse(info);
					db.run("UPDATE users SET username = ?, lastCheck = ? WHERE uuid=?", info.name, moment().format("YY-MM-DD HH:mm:SS"), uuid);
					console.log("Updated UUID "+uuid+", the name is now "+info.name);
				});
			}
		} else if(err) {
			console.log(err);
		} else {
			console.log("Something went horribly wrong! Tried to refresh UUID "+uuid+" and the entry was not found!");
		}
	});
}

module.exports = Users;