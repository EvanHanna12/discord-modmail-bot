const Discord = require('discord.js');
const { RichEmbed } = Discord;
const { db } = require('../bldb.js');
const config = require('../config.js');
const fetch = require('node-fetch');
const logs = require('../logdb.js');
const arr = require('../Array.js');
const moment = require('moment');

module.exports = async (client, message, args, command) => {
	db.defer.then(async () => {
		const uid = message.author.id;
		const tag = message.author.tag,
			avatar = message.author.displayAvatarURL;
		let tag_clean = `${tag
			.split('#')[0]
			.toLowerCase()
			.replace(/[^A-Za-z0-9_-]/g, '')
		}-${tag
			.split('#')[1]}`;
		if (tag_clean.length <= 5) tag_clean = `invalid_username#${tag.split('')[1]}`;

		const getID = /ID=(\d{17,18});/g;
		const guild = client.guilds.get(config.guild);
		const support = guild.roles.get(config.support);
		const log = guild.channels.get(config.log);
		const re = /\d{17,18}/g;
		

                let thread;
		if ((/modmail-/).test(message.channel.name)) thread = message.channel;

		let user;
		if (thread) user = await client.fetchUser(getID.exec(thread.topic)[1]);
		user = user ? user : false;
		if (!user && thread) return err('Invalid user. Please try closing the channel manually.');
		let k;
		if (user) k = guild.id + '_' + user.id;

                if (re.test(message.content)) {
			let inv = false;
			user = await client.fetchUser(args[0]).catch(() => { inv = true; });
			if (inv) return err('Invalid user.');

			k = guild.id + '_' + user.id;
		}


		logs.ensure(k, { messages: [], logs: [], reason: '' });



		if (['r', 'reply'].includes(command)) {

			message.delete();
			const content = args.join(' ');

			if (!message.member.roles.has(support.id)) return err('Hmm, seems like you don\'t have the preferred role for using this, so you don\'t have have access to use this command!').then(m => m.delete(5000));
			if (content.length > 2000) return err('Reply max characters: 2000.');
			if (!content) return err('Reply content required!');

			const role = message.member.highestRole.name.toLowerCase().replace(/^./, char => char.toUpperCase());


			user.send(`**(${role}) ${message.author.tag}**: ${content}`)
				.catch(error => {
					err('An error occured while sending the message!');
				});

			message.channel.send(`**(${role}) ${message.author.tag}**: ${content}`);

			logs.push(k, `(${role}) ${message.author.tag}: ${content}`, 'messages');

		}


		if (['ar', 'areply', 'anonreply', 'anonymousreply'].includes(command)) {

			message.delete();
			const content = args.join(' ');

			if (!message.member.roles.has(support.id)) return err('Hmm, seems like you don\'t have the preferred role for this, so you don\'t have have access to use this command!').then(m => m.delete(5000));
			if (content.length > 2000) return err('Reply max characters: 2000.');
			if (!content) return err('Reply content required!');


			user.send(`**Anonymous**: ${content}`)
				.catch(() => {
					err('An error occured while sending the message!');
				});

			message.channel.send(`**(Anonymous) ${tag}**: ${content}`);

			logs.push(k, `Anonymous: ${content}`, 'messages');

		}


		if (['c', 'close'].includes(command)) {

			arr.push(message.channel.id);
			message.delete();
			const reason = args.join(' ');
			if (!message.member.roles.has(support.id)) return err('Hmm, seems like you don\'t have the preferred role for this, so you don\'t have have access to use this command!').then(m => m.delete(5000));

			if (reason.length > 128) return err('Chosing reason max characters: 128.');
			if (!reason) return err('Closing reason required!');

			const msg = logs.get(k, 'messages').join('\n');

			const key = await fetch('https://hasteb.in/documents', { method: 'POST', body: msg })
				.then(response => response.json())
				.then(body => body.key);
			const link = `https://hasteb.in/${key}.txt`;
			logs.push(k, `\`Reason: ${logs.get(k).reason} | ${moment(Date.now(), 'unix').format('L')}\`: ${link}`, 'logs');

			const closedUser = new RichEmbed()
				.setTitle('This thread has been closed!')
				.addField('Closed By', `${tag} (${uid})`)
				.addField('Reason', reason)
				.addField('Logs', `[Here](${link})`)
				.setColor('PURPLE')
				.setFooter('Do not reply to this unless you need to create a new thread!');
			user.send(closedUser).catch(() => {
				logerr(`An error occured while sending the message to ${user.tag}!`);
			});

			const closedLog = new RichEmbed()
				.setTitle('Modmail Closed!')
				.addField('Opened By', `${user.tag} (${user.id})`)
				.addField('Closed By', `${tag} (${uid})`)
				.addField('Reason', reason)
				.addField('Logs', `[Here](${link})`)
				.setColor('PURPLE');
			log.send(closedLog).catch(() => {
				logerr('An error occurred!');
			});

			let closed = true;
			message.channel.delete(reason).catch(() => { closed = false; });
			if (!closed) return err('An error occured closing the channel!');
			logs.delete(k, 'messages');
			logs.set(k, 'messages', []);

		}


		if (['bl', 'blacklist'].includes(command)) {

			message.delete();

			db.defer.then(() => {

				let dbuser;
				if (re.test(message.content)) dbuser = db.get(args[0]);
				else dbuser = db.get(uid);

				let reason;

				if (re.test(message.content)) {
					args.shift();
					reason = args.join(' ');
				}
				else reason = args.join(' ');

				let un, unb, cl, cur_bl, origReason;

				if (!message.member.roles.has(support.id)) return err('Hmm, seems like you don\'t have the support role, so you don\'t have have access to use this command!').then(m => m.delete(5000));

				if (dbuser.bl.active) {

				 	db.setProp(user.id, 'bl', {
						active: false,
						reason: null,
						mod: null,
					});
					un = 'un', unb = 'Unb', cl = 0x00FF00, cur_bl = false;

				}
				else {

					if (!reason) return err('The reason to blacklist the user is required!').then(m => m.delete(5000));
					if (!reason.length > 128) return err('The reason must be less than 128 characters!').then(m => m.delete(5000));

					db.setProp(user.id, 'bl', {
						active: true,
						reason,
						mod: `${tag} (${uid})`,
					});

					un = '', unb = 'B', cl = 0xFF0000, cur_bl = true;

				}

				const embed = new RichEmbed()
					.setTitle(`${unb}lacklisted ${user.tag}!`)
					.setDescription(`Successfully ${un}blacklisted ${user.tag} ${cur_bl ? `for \`${reason}\`` : `\n(blacklisted by \`${dbuser.bl.mod}\` for \`${dbuser.bl.reason}\`)`}`)
					.setColor(cl)
					.setFooter(user.tag, user.displayAvatarURL);
				message.channel.send(embed);
			});

		}


		if (command === 'logs') {

			const theLog = logs.get(k, 'logs');

			if (!theLog.length) message.channel.send('This member doesn\'t have any previous thread.');

			else message.channel.send(`Logs:\n${theLog.join('\n')}`);

		}


		function err(text) {
			const errEmbed = new RichEmbed()
				.setTitle('Error!')
				.setDescription(text)
				.setColor(0xFF0000);
			return message.channel.send(errEmbed);
		}

		function logerr(text) {
			const errEmbed = new RichEmbed()
				.setTitle('Error!')
				.setDescription(text)
				.setColor(0xFF0000);
			return log.send(errEmbed);
		}


	});

};
