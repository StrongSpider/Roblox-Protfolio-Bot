const { getDiscordData, tokenFromGuild } = require('./functions/saveModule.js');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config.json').bot;

const axios = require("axios");
const fs = require('node:fs');

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const client = new Client({ intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.GuildIntegrations]});
client.commands = new Collection();

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
	client.guilds.cache.forEach(guild => tokenFromGuild(guild.id));
});

client.on('debug', (deb) => {
	console.log(deb)
})

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	const firebasetoken = await tokenFromGuild(message.guildId)
	const discordData = await getDiscordData(firebasetoken)

	for (var channel of discordData.live_channels) {
		if (message.channelId === channel) {
			discordData.experiences.forEach(id => {
				axios.post(`https://apis.roblox.com/messaging-service/v1/universes/${id}/topics/PortfolioTopic`, { "message": `{ "content": "${message.content}", "user": "${message.member.user.tag}" }` }, {
					headers: {
						'x-api-key': discordData.roblox_api_key,
						'Content-Type': 'application/json'
					}
				})
			});
			break;
		}
	}
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		//await interaction.reply({ content: error.message, ephemeral: true });
		throw error;
	}
});

client.login(token);