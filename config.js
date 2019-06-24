/*
  Setting up the bot in a new server:
  - Update the IDs and bot token below.
*/

const config = {
	token: 'HERE',
	guild: 'HERE', // Your server ID where you'll use it.
	log: 'HERE', // Log channel ID.
	modmail: 'HERE', // Modmail category ID. You can leave it blank if you don't want to move it to a specific catgeory.
	support: 'HERE', // Support Team role ID.
	maxThreads: 1, // The max amount of modmail threads in the guild. 0 would mean infinity.
	autoreply: false, // Auto replies to the user without invoking the reply-command. It's set to false (default) right now, you can set it to true if you want it.
};

module.exports = config;