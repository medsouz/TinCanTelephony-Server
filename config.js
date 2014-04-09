module.exports = {
	host: "0.0.0.0",
	port: 9999,
	noAuth: true,//If true the server will not verify the user's login with Mojang's server. WARNING: This allows players to impersonate others!
	verbose: true,
	accountTTL: 3600//Number of seconds an account entry can exist without checking Mojang's servers for potential username changes. Higher number allows friends to be gathered faster but can cause names to be different in TCT than ingame.
}