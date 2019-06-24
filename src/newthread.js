const Discord = require('discord.js');
const { RichEmbed } = Discord;
const { db } = require('../bldb.js');
const config = require('../config.js');
const logs = require('../logdb.js');
const replies = new Map();

module.exports = async (client, message) => {
	db.defer.then(async () => {
		const uid = message.author.id;
		const tag = message.author.tag;
		let tag_clean = `${tag
			.split('#')[0]
			.toLowerCase()
			.replace(/[^A-Za-z0-9_-]/g, '')
		}-${tag
			.split('#')[1]}`;
		if (tag_clean.length <= 5) tag_clean = `invalid_username#${tag.split('')[1]}`;

		const user = db.get(uid);

		const hasID = new RegExp(`ID=${uid};`);

		const guild = client.guilds.get(config.guild);
		let parent = guild.channels.get(config.modmail);
		parent = parent ? parent : false;
		const support = guild.roles.get(config.support);
		let thread = guild.channels.filter(thr => hasID.test(thr.topic));
		if (thread) thread = thread.first();

		const key = guild.id + '_' + uid;
		logs.ensure(key, { messages: [], logs: [], reason: '' });

		if (user.bl.active) {
			const no = new RichEmbed()
				.setTitle('You are blacklisted!')
				.addField('Moderator', user.bl.mod)
				.addField('Reason', user.bl.reason)
				.setColor(0xFF0000);
			return message.channel.send(no);
		}

		message.react('✅');

		if (!thread) {
			const ready = new RichEmbed()
				.setTitle('Your thread has been created!')
				.setDescription([
					`You have created a new thread for: ${message.content.length > 1000 ? `${message.content.slice(0, 1000)}...` : message.content}`,
					'You should recieve a reply from our **Support Team** very soon!',
					'',
					'Please feel free to add any additional information we may need to help you *now.*',
				])
				.setColor('GREEN')
				.setFooter(guild.name, guild.iconURL);
			message.author.send(ready);

			const topic = [
				`ID=${uid};`,
				`TAG=${tag};`,
				// `THREAD=${log.randomID()}`
			].join('\n');

			thread = await guild.createChannel(`modmail-${tag_clean}`);
			if (parent) await thread.setParent(parent);
			await thread.setTopic(topic);

			await thread.overwritePermissions(guild.defaultRole, {
				SEND_MESSAGES: false,
				READ_MESSAGES: false,
			});
			await thread.overwritePermissions(support, {
				SEND_MESSAGES: true,
				READ_MESSAGES: true,
			});

			const embed = new RichEmbed()
				.setTitle('New Modmail!')
				.setColor('BLUE')
				.setAuthor(message.author.tag, message.author.displayAvatarURL)
				.setDescription(message.content);
			thread.send(support, embed);
			logs.set(key, message.content, 'reason');
			logs.push(key, `${message.author.tag}: ${message.content}`, 'messages');

		}
		else {

			send(message, `**${message.author.tag}**: ${message.content}`);
			logs.push(key, `${message.author.tag}: ${message.content}`, 'messages');

		}


		async function send(msg, ...args) {

			let reply = replies.get(msg.id);

			if (reply) {

				reply = await reply.edit(...args);
			}
			else {
				reply = await thread.send(...args);
				replies.set(msg.id, reply);
			}


		}

	});


};
