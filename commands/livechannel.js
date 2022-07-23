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
            setDiscordData(firebasetoken, {
                discord_id: discordData.discord_id,
                experience: discordData.experience || '',
                live_channels: interaction.channel.id,
                roblox_api_key: discordData.roblox_api_key || '',
                roblox_group_id: discordData.roblox_group_id || '',
                users: discordData.users || []
            })

            await interaction.reply('This channel has been set up as a live roblox chat channel!');
        } else {
            // Toggle Off
            setDiscordData(firebasetoken, {
                discord_id: discordData.discord_id,
                experience: discordData.experience || '',
                live_channels: '',
                roblox_api_key: discordData.roblox_api_key || '',
                roblox_group_id: discordData.roblox_group_id || '',
                users: discordData.users || []
            })

            await interaction.reply('This channel has disabled its live messaging functionality!');
        }
	},
};