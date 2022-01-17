const { CommandoClient, util } = require('discord.js-commando');
const path = require('path');

const client = new CommandoClient({
    commandPrefix: '!',
    owner: '343751662592065537',
    invite: 'https://discord.gg/7r2MJzVChS',
  });

client.registry
  .registerDefaultTypes()
  .registerGroups([
      ['tester', 'Whoever has acsess to bot.'],
  ])
  .registerDefaultGroups()
	.registerDefaultCommands(({
		help: false, 
		prefix: false, 
		ping: false,
		_eval: false,
		unknownCommand: false, 
		commandState: false
		}))
    .registerCommandsIn(path.join(__dirname, 'commands'))

client.once('ready', () =>{
    console.log(`Logged in as ${client.user.tag}! (${client.user.id})`);
  client.user.setActivity('Testing out some commands...', {
      type: 'PLAYING'
    })
    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
    .catch(console.error);
})

client.on('error', console.error);
client.login(require('./settings.json').token);
