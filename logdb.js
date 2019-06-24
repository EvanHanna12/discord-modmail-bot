const Enmap = require('enmap');
const logs = new Enmap({ name: 'log-db', ensureProps: true });


module.exports = logs;