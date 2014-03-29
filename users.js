//Setup SQLite Table
db.run("create table if not exists users(id INTEGER PRIMARY KEY, username TEXT)");

var Users = {};

Users.login = function(socket) {
	db.get("SELECT * FROM users WHERE username=?",socket.username, function(err, row) {
		if(!row && !err) {//if the user isn't found and the code does not error...
			console.log("User "+socket.username+" isn't in the database, creating...");
			db.run("INSERT INTO users VALUES (NULL, ?)", socket.username);
		}else if(err) {
			console.log(err);
		}
	});
	Users.getID(socket.username, function(id){
		socket.userID = id;
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

module.exports = Users;