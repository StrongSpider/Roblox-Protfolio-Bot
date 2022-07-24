const { SlashCommandBuilder } = require('@discordjs/builders');
const { getDiscordData, tokenFromGuild, setDiscordData } = require('../functions/saveModule.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('livechannel')
		.setDescription('Toggles livechannel mode for roblox/discord chat.')
        .addBooleanOption(option => 
            option.setName('toggle')
                .setDescription('The Toggle')
                .setRequired(true)),
	async execute(interaction) {
        const toggle = interaction.options.getBoolean('toggle')
        
        const firebasetoken = await tokenFromGuild(interaction.guild.id)
        const discordData = await getDiscordData(firebasetoken)

        if (toggle) {
            // Toggle On
            discordData.live_channels = interaction.channel.id
            await interaction.reply('This channel has been set up as a live roblox chat channel!');
        } else {
            // Toggle Off
            discordData.live_channels = ''
            await interaction.reply('This channel has disabled its live messaging functionality!');
        }

        setDiscordData(firebasetoken, discordData)
	},
};