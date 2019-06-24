const Enmap = require('enmap');
const db = new Enmap({ name: 'db' });
const config = require('./config.js');
const ensure = (client, user, userAsMember) => {

	db.defer.then(() => {
		let mod = false;
		if(userAsMember) mod = userAsMember.roles.has(config.support);

		db.ensure(user.id, {});


		$('bl', { active: false, reason: null, mod: null });
		$('mod', false);
		$('threads', []);

		if(mod) db.setProp(user.id, 'mod', mod);

		function $(prop, def) {
			db.hasProp(user.id, prop) ? null :
				db.setProp(user.id, prop, def);
		}
	});
};
module.exports = { ensure, db };