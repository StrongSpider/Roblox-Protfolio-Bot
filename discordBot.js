const { getDiscordData, tokenFromGuild } = require('./functions/saveModule.js');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config.json').bot;

const axios = require("axios");
const fs = require('node:fs');

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Discord.js v14 new intents. Add as needed.
const client = new Client({
	intents: [
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.Guilds,
	]
});

// Discord.js command handler (new commando)
client.commands = new Collection();

commandFiles.forEach(file => {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
})

client.once('ready', () => {
	// Queues token for each guild to make sure tokens are on server before requests are sent
	client.guilds.cache.forEach(guild => tokenFromGuild(guild.id));
});

client.on('debug', console.log)

client.on('messageCreate', async ({ channelId, guildId, content, member, author }) => {
	if (author.bot) return;

	// Live Channel messaging for roblox/discord communication

	// Gets live channel information from guild
	const firebasetoken = await tokenFromGuild(guildId)
	const { experience, live_channels, roblox_api_key } = await getDiscordData(firebasetoken)

	// Makes sure the channel is the active live channel
	if (channelId === live_channels) {
		// Posts to roblox MessagingService using guild API key and experience
		axios.post(
			`https://apis.roblox.com/messaging-service/v1/universes/${experience}/topics/PortfolioTopic`, { "message": `{ "content": "${content}", "user": "${member.user.tag}" }` }, {
			headers: {
				'x-api-key': roblox_api_key,
				'Content-Type': 'application/json'
			}
		})
	}
})

client.on('interactionCreate', async interaction => {
	// Handles command interations and executes command scripts
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		await interaction.reply({ content: error.message, ephemeral: true });
	}
});

client.login(token); // Discord bot login