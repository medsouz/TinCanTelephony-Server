//Setup SQLite Table
db.run("create table if not exists users(id INTEGER PRIMARY KEY, username TEXT, uuid TEXT, lastCheck DATETIME, invitePublic BOOLEAN, messagePublic BOOLEAN, serverPublic BOOLEAN)");

var Users = {},
	moment = require("moment"),
	mcauth = require("mcauth");

Users.login = function(socket) {
	db.get("SELECT * FROM users WHERE username=?", socket.username, function(err, row) {
		if(!row && !err) {//if the user isn't found and the code does not error...
			console.log("User "+socket.username+" isn't in the database, checking information...");
			mcauth.getMojangProfile(socket.username, function(profile) {
				console.log(profile);
				var id;
				if(profile.profiles[0]) {
					db.run("INSERT INTO users VALUES (NULL, ?, ?, ?, 1, 1, 1)", socket.username, profile.profiles[0].id, moment().format("YY-MM-DD HH:mm:SS"), function () {
						if(this) {
							socket.userID = this.lastID;
							console.log("Done! "+socket.username+" (UUID: "+profile.profiles[0].id+") has been registered");
							Users.getSettings(socket);
						} else {
							packets.sendDisconnect(socket, "Something went wrong registering the user!");
						}
					});	
				} else {
					console.log("User "+socket.username+" does not exist in Mojang's database!");
					packets.sendDisconnect(socket, "Username \""+socket.username+"\" not found in Mojang's database!");
				}
			});
		} else if(err) {
			console.log(err);
		} else {
			socket.userID = row.id;
			Users.getSettings(socket);
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

Users.updateSettings = function(id, settings) {
	db.run("UPDATE users SET invitePublic = ?, messagePublic = ?, serverPublic = ? WHERE id=?", settings.invitePublic, settings.messagePublic, settings.serverPublic, id);
}

Users.getSettings = function(socket) {
	db.get("SELECT * FROM users WHERE id = ?", socket.userID, function(err, row) {
		if(!err) {
			var settings = {};
			settings.serverPublic = row.serverPublic;
			settings.messagePublic = row.messagePublic;
			settings.invitePublic = row.invitePublic;
			packets.sendPacket(socket, 6, settings);
		}
	});
}

module.exports = Users;