const { SlashCommandBuilder, } = require('@discordjs/builders');
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { getDiscordData, tokenFromGuild, setDiscordData } = require('../functions/saveModule.js');

const noblox = require('noblox.js');
const axios = require("axios");

// Uses roblox's web api to retrieve group thumbnail (noblox only has user thumbnails)
const getGroupThumbnail = async function (groupid) {
    const data = await axios.get("https://thumbnails.roblox.com/v1/groups/icons?groupIds=" + groupid + "&size=420x420&format=Png&isCircular=false");
    return data.data.data[0].imageUrl; // Returns the actual thumbnail not the array like noblox
}

function makeGroupLink(groupid, name) {
    // Replaces all specail characters from name
    name = name.replace(/[^a-z|\s]/gi, '')
    name = name.replace(/[|]/g, '')

    // Spilts name into array
    const charArray = name.split(' ')
    for (let cur of charArray) {
        if (cur == '') { charArray.splice(charArray.indexOf(cur)) }
    }

    // Returns final product
    return "https://www.roblox.com/groups/" + groupid + "/" + charArray.join('-') + "#!/about";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('groupconfig')
        .setDescription('Configers group set to discord server.'),
    async execute(interaction) {
        // Makes sure that even if the slash command was not set up properly, only authorized users can access the settings
        if (!interaction.member.permissions.has("MANAGE_GUILD")) { interaction.reply({ content: "You do not have permission to use this commmand.", ephemeral: true }); return; }

        // Gets discordData from firebase
        const firebasetoken = await tokenFromGuild(interaction.guild.id)
        const discordData = await getDiscordData(firebasetoken)

        // Work around for discord's api only allowing strings in modals but not being able to call toString() on undefined
        let dataExperience = discordData.experience
        if (typeof dataExperience !== 'undefined') dataExperience = dataExperience.toString();

        const fields = [
            new TextInputBuilder()
                // Always require groupid
                .setCustomId('groupid')
                .setLabel('Group ID of your group 👨🏿‍🤝‍👨🏿')
                .setPlaceholder('Enter your group id')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            new TextInputBuilder()
                .setCustomId('apikey')
                .setLabel('Valid API Key (DO NO SHARE TO THE PUBLIC) 🔑') // Short explination of security issues due to limited characters
                .setPlaceholder('Enter Roblox API key')
                .setValue(discordData.roblox_api_key || '') // Sets value to the key already in the system
                .setStyle(TextInputStyle.Short)
                .setRequired(typeof discordData.roblox_api_key === 'undefined'), // Only required if there is no key
            new TextInputBuilder()
                .setCustomId('experience')
                .setLabel('Experience ID connected to the API key 🎮')
                .setPlaceholder('Enter your experience ID')
                .setValue(dataExperience || '') // Sets value to the experience already in the system
                .setStyle(TextInputStyle.Short)
                .setRequired(typeof dataExperience === 'undefined') // Only required if there is no experience
        ]


        // Maps all fields to a discord components constructor
        const components = fields.map(field => new ActionRowBuilder().addComponents([field]))

        // Sets up the main modal
        const modal = new ModalBuilder()
            .setCustomId('configModal')
            .setTitle('Group Configeration 🔨🕵️‍♂️')
            .addComponents(components) // Adds the components contructors
        await interaction.showModal(modal);

        // Sets up the modal interaction collector
        const submitted = await interaction.awaitModalSubmit({
            time: 60000, // 60 secound timeout
            filter: i => i.user.id === interaction.user.id, // Filters only base interaction user
        })

        if (!submitted) return; // If timeout return

        // Gatherd Modal information
        const groupid = parseInt(submitted.fields.getTextInputValue('groupid'));
        const apikey = submitted.fields.getTextInputValue('apikey');
        const experience = submitted.fields.getTextInputValue('experience');

        // Checks groupid
        if (isNaN(groupid)) return submitted.reply({ content: "You need to enter a number!", ephemeral: true });

        // Gets group information from groupid
        const groupData = await noblox.getGroup(groupid)
        const thumbnailURL = await getGroupThumbnail(groupid)

        const discordOwner = await submitted.guild.fetchOwner(submitted.guild.ownerId)
        
        // User feedback
        const embed = new EmbedBuilder()
            .setFooter({ text: `${submitted.user.tag} has successfully linked this server to group ${groupid}` })
            .setTitle('Successfully linked to this guild! ✔')
            .setThumbnail(thumbnailURL)
            .setColor([0, 155, 255])
            .setTimestamp()
            .setFields([
                { name: `Roblox Group Name`, value: `[${groupData.name}](${makeLink(groupid, groupData.name)})`, inline: true },
                { name: `Roblox Group ID`, value: groupid.toString(), inline: true },
                { name: `Roblox Group Owner`, value: groupData.owner.username, inline: true },
                { name: `Discord Guild Name`, value: submitted.guild.name, inline: true },
                { name: `Discord Guild ID`, value: submitted.guildId, inline: true },
                { name: `Discord Guild Owner`, value: discordOwner.displayName, inline: true },
            ])


        // Backend changing data
        setDiscordData(firebasetoken, {
            discord_id: submitted.guildId,
            experience: experience,
            live_channels: discordData.live_channels || '',
            roblox_api_key: apikey || discordData.roblox_api_key || '',
            roblox_group_id: groupid,
            users: discordData.users || []
        })
        
        submitted.reply({ embeds: [embed], ephemeral: true })
    }
}