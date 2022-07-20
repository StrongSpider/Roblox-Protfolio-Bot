const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { getDiscordData, tokenFromGuild } = require('../functions/saveModule.js');

const noblox = require('noblox.js');
const axios = require("axios");

async function getRelationship(groupId, relationship, playerGroups) {
    let res = [];
    try {
        const data = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=0&model.maxRows=1`)

        const totalGroupCount = data.data.totalGroupCount
        const modifiedNumber = Math.floor(totalGroupCount / 4)

        function checkPlayerGroup(checkGroup) {
            if (res.length === 4) return;
            for (let playerGroup of playerGroups) {
                if (checkGroup.id == playerGroup.Id) {
                    res.push(playerGroup)
                    break;
                }
            }
        }

        if (modifiedNumber == 0) {
            const newPageData = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=0&model.maxRows=4`)
            newPageData.data.relatedGroups.forEach(checkPlayerGroup)
        } else {
            for (let i = 0; i < Math.floor(totalGroupCount / 4); i++) {
                const newPageData = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=${i * 4}&model.maxRows=4`)
                newPageData.data.relatedGroups.forEach(checkPlayerGroup)
                if (res.length === 4) break;
            }
        }

        if (totalGroupCount > 4) res[5] = true 
        else res[5] = false
    } finally {
        return res;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whois')
        .setDescription('Gets information on player.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Gets information from the provided discord user.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('Target user.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('username')
                .setDescription('Gets information from the provided roblox username.')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Target player username.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('userid')
                .setDescription('Gets information from the provided roblox userid.')
                .addNumberOption(option =>
                    option.setName('userid')
                        .setDescription('Target player userid.')
                        .setRequired(true))),
    async execute(interaction) {
        var username = null
        var userid = null

        if (interaction.options.getSubcommand() === "user") {
            const member = interaction.options.getMember('target') || interaction.member
            username = member.displayName
        } else if (interaction.options.getSubcommand() === 'username') {
            username = interaction.options.getString('username') || interaction.member.displayName
        } else if (interaction.options.getSubcommand() === "userid") {
            userid = interaction.options.getNumber('userid')
        }
        
        if (userid === null) userid = await noblox.getIdFromUsername(username)

        const userData = await noblox.getPlayerInfo(userid)
        const thumbnailURL = await noblox.getPlayerThumbnail(userid, 420)

        const userGroups = await noblox.getGroups(userid)

        const firebasetoken = await tokenFromGuild(interaction.guild.id)
	    const discordData = await getDiscordData(firebasetoken)

        const activeGroupData = await noblox.getGroup(discordData.roblox_group_id)
        const alliedGroupsData = await getRelationship(discordData.roblox_group_id, "Allies", userGroups)
        const enemiedGroupsData = await getRelationship(discordData.roblox_group_id, "Enemies", userGroups)

        var activePlaterGroup = false
        for (let playerGroup of userGroups) {
            if (activeGroupData.id == playerGroup.Id) {
                activePlaterGroup = playerGroup
                break;
            }
        }

        //Discord.js v14 hack
        const embedFields = []
        const addField = (name, value, inline) => {
            inline = inline || false
            embedFields.push({ name: name, value: value, inline: inline})
        }
        
        var whoisEmbed = new EmbedBuilder()
            .setFooter({ text: 'Bot made by spiider.co' })
            .setThumbnail(thumbnailURL[0].imageUrl)
            .setTitle(userData.username + ' 🔎')
            .setColor([0, 155, 255])
            .setTimestamp()

            addField(`Username`, `[${userData.username}](https://www.roblox.com/users/${userid}/profile)`, true)
            addField(`User ID`, `${userid}`, true)

        function makeLink(ID, name) {
            name = name.replace(/[^a-z|\s]/gi, '')
            name = name.replace(/[|]/g, '')
            var charArray = name.split(' ')
            for (let cur of charArray) {
                if (cur == '') { charArray.splice(charArray.indexOf(cur)) }
            }
            name = charArray.join('-')
            return "https://www.roblox.com/groups/" + ID + "/" + name + "#!/about";
        }

        function addToField(playerGroup, string) {
            if(typeof playerGroup === 'boolean') return string;
            else return string + `\n[${playerGroup.Name}](${makeLink(playerGroup.Id, playerGroup.Name)}) →  ${playerGroup.Role}`
        }

        var mainField = ''
        var alliedField = ''
        var enemyField = ''

        alliedGroupsData.forEach(group => alliedField = addToField(group, alliedField))
        enemiedGroupsData.forEach(group => enemyField = addToField(group, enemyField))
        mainField = addToField(activePlaterGroup, mainField)

        if (alliedGroupsData[5] === true) alliedField = alliedField + "\nTo see more groups, use the /allies command"
        if (enemiedGroupsData[5] === true) enemyField = enemyField + "\nTo see more groups, use the /enemies command"

        if (mainField !== '') { addField(`Main Group`, mainField) }
        if (alliedField !== '') { addField(`Allied Groups`, alliedField) }
        if (enemyField !== '') { addField(`Enemied Groups`, enemyField) }
        if (userData.blurb === '') { addField(`Description`, "No description avalible") } else { addField(`Description`, userData.blurb) }

        addField(`Created On`, userData.joinDate.toLocaleDateString())

        //Discord.js v14 hack
        whoisEmbed.addFields(embedFields)

        await interaction.reply({ embeds: [whoisEmbed] });
    },
};