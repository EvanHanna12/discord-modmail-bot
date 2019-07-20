const Discord = require('discord.js');
const { RichEmbed, Client } = Discord;
const client = new Client();
const fetch = require('node-fetch');
const moment = require('moment');

const color = 'BLUE';
const config = require('./config.js');
const logs = require('./logdb.js');
const arr = require('./Array.js');


client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setActivity('DM me for support!');
});

client.on('messageUpdate', (oldM, newM) => {
	const time = moment().unix() - moment(oldM.createdAt).unix();
	if (time > 30) return;
	client.emit('message', newM);
});

client.on('channelDelete', async channel => {

	const thread = channel;
	const getID = /ID=(\d{17,18});/g;
	const guild = client.guilds.get(config.guild);
	const chan = guild.channels.get(config.log);
	let user = client.users.get(getID.exec(thread.topic)[1]);
	user = user ? user : false;
	let k;
	if (!user) chan.send('Cannot fetch the logs, invalid member!');
	else if (user) k = guild.id + '_' + user.id;

	logs.ensure(k, { messages: [], logs: [], reason: '', closed: false });

	const index = arr.findIndex(i => i === thread.id);
	if (arr.includes(channel.id)) return arr.splice(index, 1);

	if (channel.name.includes('modmail-') && user) {

		const msg = logs.get(k, 'messages').join('\n');

		const key = await fetch('https://hasteb.in/documents', { method: 'POST', body: msg })
			.then(response => response.json())
			.then(body => body.key);
		const link = `https://hasteb.in/${key}.txt`;

		logs.push(k, `\`Reason: ${logs.get(k).reason} | ${moment(Date.now(), 'unix').format('L')}\`: ${link}`, 'logs');

		const closedUser = new RichEmbed()
			.setTitle('This thread has been closed!')
			.addField('Reason', 'The channel was deleted.')
			.addField('Logs', `[Here](${link})`)
			.setColor('PURPLE')
			.setFooter('Do not reply to this unless you need to create a new thread!');
		user.send(closedUser).catch(() => {
			logerr(`An error occured while sending the message to ${user.tag}!`);
		});


		const closedLog = new RichEmbed()
			.setTitle('Modmail Closed!')
			.addField('Opened By', `${user.tag} (${user.id})`)
			.addField('Reason', 'The channel was deleted.')
			.addField('Logs', `[Here](${link})`)
			.setColor('PURPLE');
		chan.send(closedLog).catch(() => {
			logerr('An error occurred!');
		});

		logs.delete(k, 'messages');

	}

	function logerr(text) {
		const errEmbed = new RichEmbed()
			.setTitle('Error!')
			.setDescription(text)
			.setColor(0xFF0000);
		return chan.send(errEmbed);
	}

});

client.on('message', async message => { // For normal commands.
	if (message.author.bot) return;
	if (message.channel.type === 'dm') return;
	require('./bldb.js').ensure(client, message.member);

	const guild = message.guild;

	const modRole = guild.roles.find(r => r.name === 'Support Team');

	const tag = message.author.tag,
		avatar = message.author.displayAvatarURL;

	const prefixes = ['!', `<@${client.user.id}>`, `<@!${client.user.id}>`];
	let prefix = false;
	for (const p of prefixes) ~message.content.indexOf(p) ? prefix = p : null;
	if (!prefix) return;

	const args = message.content.slice(prefix.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();


	if (command === 'help') {

		if (message.member.roles.has(modRole)) return message.channel.send('Hmm, seems like you don\'t have the preferred role for this, so you don\'t have have access to use this command!');

		const embed = new RichEmbed()
			.setTitle('Help')
			.setDescription([
				'`!reply (!r)` - send an official reply to the user in this channel thread.',
				'`!anonreply (!ar)` - send an anonymous reply to the user in this channel thread.',
				'`!close (!c)` - close the thread in the current channel.',
				'`!blacklist (!bl)` - blacklists or unblacklists (toggle) the user who owns the current thread from using the bot. Or it can be an ID of that user you want to blacklist/unblacklist.',
				'`!logs` - shows logs for the current user who owns the thread.',
			])
			.setColor(color)
			.setFooter(tag, avatar);
		return message.channel.send(embed);
	}


});


client.on('message', async message => {
  
	const prefix = '!';

	if (message.author.bot) return;
	const max = config.maxThreads;
	const autoreply = config.autoreply;
	const guild = client.guilds.get(config.guild);
	const role = guild.roles.get(config.support);
	if (max > 1 && message.channel.type === 'dm' && guild.channels.filter(c => c.type === 'text' && c.name.includes('modmail')).size === max && !guild.channels.find(c => c.type === 'text' && c.name === `modmail-${message.author.username.toLowerCase()}-${message.author.discriminator}`)) return message.channel.send(`This guild has set the max threads limit to ${max}. Seems like there is already ${max} threads. Please wait!`);
	if (max === 1 && message.channel.type === 'dm' && guild.channels.some(c => c.type === 'text' && c.name.includes('modmail-')) && !guild.channels.find(c => c.type === 'text' && c.name === `modmail-${message.author.username.toLowerCase()}-${message.author.discriminator}`)) return message.author.send('There is another thread open in this guild, till that you can\'t open another, sorry. Please wait!');
	const newThread = require('./src/newthread.js'),
		mod = require('./src/mod.js');
	const args = message.content.slice(prefix.length).trim().split(/\s+/g);
	const command = args.shift().toLowerCase();

	if (autoreply && (/modmail-/).test(message.channel.name) && message.member.roles.has(role.id)) {
		const r = new RegExp(`${prefix}\s*(close|c|blacklist|bl|logs)`);
		if (r.test(message.content)) return mod(client, message, args, command);
		message.delete();
		const thread = message.channel;
		const getID = /ID=(\d{17,18});/g;
		let user = client.users.get(getID.exec(thread.topic)[1]);
		user = user ? user : false;
		if (!user) return message.channel.send('Invalid user.');
		let k;
		if (user) k = guild.id + '_' + user.id;
		logs.ensure(k, { messages: [], logs: [], reason: [] });

		const rol_e = message.member.highestRole.name.toLowerCase().replace(/^./, char => char.toUpperCase());

		user.send(`**(${rol_e}) ${message.author.tag}**: ${message.content}`)
			.catch(error => {
				message.channel.send('An error occured while sending the message!');
			});

		message.channel.send(`**(${rol_e}) ${message.author.tag}**: ${message.content}`);

		logs.push(k, `(${rol_e}) ${message.author.tag}: ${message.content}`, 'messages');

	}

	if (message.channel.type === 'dm') {
		require('./bldb.js').ensure(client, message.author, null);
		newThread(client, message);
		return;
	}

        const r1 = new RegExp(`${prefix}\s*(bl|blacklist)`);
        if (r1.test(message.content)) return mod(client, message, args, command);
	if ((/modmail-/).test(message.channel.name)) return mod(client, message, args, command);

});

client.login(config.token);
