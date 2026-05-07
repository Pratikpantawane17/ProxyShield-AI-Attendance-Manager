// backend/jobs/agenda.js
const Agenda = require('agenda');
const mongoConnectionString = process.env.MONGO_URL;

const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: 'agendaJobs' },
  processEvery: '30 seconds', // how often agenda checks for jobs
});

agenda.on('ready', () => console.log('Agenda ready ✅'));
agenda.on('error', (err) => console.error('Agenda error', err));

module.exports = agenda;
