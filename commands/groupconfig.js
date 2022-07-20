const { SlashCommandBuilder, } = require('@discordjs/builders');
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { getDiscordData, tokenFromGuild, setDiscordData } = require('../functions/saveModule.js');

const noblox = require('noblox.js');
const axios = require("axios");

const getThumbnail = async function (groupid) {
    const data = await axios.get("https://thumbnails.roblox.com/v1/groups/icons?groupIds=" + groupid + "&size=420x420&format=Png&isCircular=false");
    return data.data.data[0].imageUrl;
}

const makeLink = function (id, name) {
    name = name.replace(/[^a-z|\s]/gi, '')
    name = name.replace(/[|]/g, '')
    var charArray = name.split(' ')
    for (let cur of charArray) {
        if (cur == '') { charArray.splice(charArray.indexOf(cur)) }
    }
    name = charArray.join('-')
    return "https://www.roblox.com/groups/" + id + "/" + name + "#!/about";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('groupconfig')
        .setDescription('Configers group set to discord server.'),
    async execute(interaction) {
        if (!interaction.member.permissions.has("MANAGE_GUILD")) { interaction.reply({ content: "You do not have permission to use this commmand.", ephemeral: true }); return; }

        const firebasetoken = await tokenFromGuild(interaction.guild.id)
	    const discordData = await getDiscordData(firebasetoken)

        const fields = [
            new TextInputBuilder()
                .setCustomId('groupid')
                .setLabel('Group ID of your group 👨🏿‍🤝‍👨🏿')
                .setPlaceholder('Enter your group id')
                .setStyle(TextInputStyle.Short)
                .setRequired(true),
            new TextInputBuilder()
                .setCustomId('apikey')
                .setLabel('Valid API Key (DO NO SHARE TO THE PUBLIC) 🔑')
                .setPlaceholder('Enter Roblox API key')
                .setValue(discordData.roblox_api_key || '')
                .setStyle(TextInputStyle.Short)
                .setRequired(typeof discordData.roblox_api_key === 'undefined'),
            new TextInputBuilder()
                .setCustomId('experiences')
                .setLabel('Experience ID connected to the API key 🎮')
                .setPlaceholder('Enter your experience ID')
                .setValue(discordData.experiences[0].toString() || '') // TODO: tostring might not work with or statment with undefined values
                .setStyle(TextInputStyle.Short)
                .setRequired(typeof discordData.experiences[0] === 'undefined')
        ]


        let components = []
        fields.forEach(field => {
            components.push(new ActionRowBuilder().addComponents([field]))
        });

        const modal = new ModalBuilder()
            .setCustomId('configModal')
            .setTitle('Group Configeration 🔨🕵️‍♂️')  
            .addComponents(components)

        await interaction.showModal(modal);

        const submitted = await interaction.awaitModalSubmit({
            time: 60000,
            filter: i => i.user.id === interaction.user.id,
        })

        if (!submitted) return;

        const groupid = parseInt(submitted.fields.getTextInputValue('groupid'));
        const apikey = submitted.fields.getTextInputValue('apikey');
        const experiences = submitted.fields.getTextInputValue('experiences');

        if (isNaN(groupid)) return submitted.reply({ content: "You need to enter a number!", ephemeral: true });

        const groupData = await noblox.getGroup(groupid)
        const thumbnailURL = await getThumbnail(groupid)

        const discordOwner = await submitted.guild.fetchOwner(submitted.guild.ownerId)

        //Discord.js v14 hack
        const embedFields = []
        const addField = (name, value, inline) => {
            inline = inline || false
            embedFields.push({ name: name, value: value, inline: inline})
        }

        var embed = new EmbedBuilder()
            .setFooter({ text: `${submitted.user.tag} has successfully linked this server to group ${groupid}` })
            .setTitle('Successfully linked to this guild! ✔')
            .setThumbnail(thumbnailURL)
            .setColor([0, 155, 255])
            .setTimestamp()

            addField(`Roblox Group Name`, `[${groupData.name}](${makeLink(groupid, groupData.name)})`, true)
            addField(`Roblox Group ID`, groupid.toString(), true)
            addField(`Roblox Group Owner`, groupData.owner.username, true)
            addField(`Discord Guild Name`, submitted.guild.name, true)
            addField(`Discord Guild ID`, submitted.guildId, true)
            addField(`Discord Guild Owner`, discordOwner.displayName, true)

            embed.addFields(embedFields)

        setDiscordData(firebasetoken, {
            discord_id: submitted.guildId,
            experiences: [ experiences ],
            live_channels: discordData.live_channels,
            roblox_api_key: apikey || discordData,
            roblox_group_id: groupid,
            users: discordData.users
        })

        submitted.reply({ embeds: [embed], ephemeral: true })
    }
}