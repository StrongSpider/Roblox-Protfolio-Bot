const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

const { getDiscordData, tokenFromGuild } = require('../functions/saveModule.js');

const noblox = require('noblox.js');
const axios = require("axios");

async function getRelationship(groupId, relationship, playerGroups) {
    const res = [];
    try {
        // Initial request to roblox
        const initalData = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=0&model.maxRows=1`)

        // Uses the inital request to calculate the number of loops needed to get all related groups
        const totalGroupCount = initalData.data.totalGroupCount
        const modifiedNumber = Math.floor(totalGroupCount / 100) + 1

        // All related groups are added to this array (gets around roblox's 100 groups per request)
        let relatedGroups = []

        // Main request loop gets all pages and adds them to relatedGroups
        for (let i = 0; i < modifiedNumber; i++) {
            const { data } = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=${i * 100}&model.maxRows=100`)
            relatedGroups = relatedGroups.concat(data.relatedGroups)
        }

        // Checks if player is in a related group and makes an array
        const relatedGroupsMembership = playerGroups.filter(playerGroup => relatedGroups.filter(relatedGroup => playerGroup.Id == relatedGroup.id).length > 0);

        // Adds 4 relatedGroupsMembership elements to the res array
        for (const playerGroup of relatedGroupsMembership) {
            if (res.length >= 4) break;
            res.push(playerGroup)
        }

    } finally {
        // Returns output of try
        return res;
    }
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
        // Deffers reply to give time for big groups to catch up with roblox api calls
        interaction.deferReply()
        try {
            // Sets up the userid and username variables that will be changed depending on the input of the user
            var [userid, username] = []

            if (interaction.options._hoistedOptions.length > 0) {
                const input = interaction.options.getMember('target') || interaction.options.getString('username') || interaction.options.getNumber('userid')
                if (typeof input === 'number') userid = input // If the input is a number, we know its userid so it sets that number to the userid
                if (typeof input === 'string') username = input // If the input is a string, we know its username so it sets that string to the username
                if (typeof input === 'object') username = input.displayName // If the input is a object, we know its a member object so it sets the username to displayName
            } else {
                username = interaction.member.displayName // If no options were givin, we assume that the target is the interaction user
            }

            // If no userid is specified, we get the userid from roblox
            if (typeof userid === 'undefined') userid = await noblox.getIdFromUsername(username)

            // Gets discordData from firebase
            const firebasetoken = await tokenFromGuild(interaction.guild.id)
            const discordData = await getDiscordData(firebasetoken)
            
            // Gets roblox user information from noblox
            const userGroups = await noblox.getGroups(userid)
            const userData = await noblox.getPlayerInfo(userid)
            const thumbnailURL = await noblox.getPlayerThumbnail(userid, 420)

            // Gets player group information from noblox and roblox web api
            const mainGroup = await noblox.getGroup(discordData.roblox_group_id)
            const mainGroupData = userGroups.find( playerGroup => playerGroup.Id == mainGroup.id ) 
            const alliedGroupsData = await getRelationship(discordData.roblox_group_id, "Allies", userGroups)
            const enemiedGroupsData = await getRelationship(discordData.roblox_group_id, "Enemies", userGroups)

            //Discord.js v14 hack (due to .addfield being deprecated, I made my own that adds the fields to an array due to this scripts use of .addField to make pages)
            const embedFields = []
            const addField = (name, value, inline) => {
                inline = inline || false
                embedFields.push({ name: name, value: value, inline: inline })
            }

            // Main embed
            const whoisEmbed = new EmbedBuilder()
                .setFooter({ text: 'Bot made by spiider.co' })
                .setThumbnail(thumbnailURL[0].imageUrl) // roblox sends thumbnail in an array because for some reason it thinks that you will be mass requesting thumbnails
                .setTitle(userData.username + ' 🔎')
                .setColor([0, 155, 255]) // Sky Blue
                .setTimestamp()

            // First line fields
            addField(`Username`, `[${userData.username}](https://www.roblox.com/users/${userid}/profile)`, true)
            addField(`User ID`, `${userid}`, true)

            // Concats strings togeather to form big fields
            let [mainField, alliedField, enemyField] = ['', '', '']

            alliedGroupsData.forEach(group => alliedField = alliedField.concat('\n', `[${group.Name}](${makeGroupLink(group.Id, group.Name)}) →  ${group.Role}`))
            enemiedGroupsData.forEach(group => enemyField = enemyField.concat('\n', `[${group.Name}](${makeGroupLink(group.Id, group.Name)}) →  ${group.Role}`))
            mainField = `[${mainGroupData.Name}](${makeGroupLink(mainGroupData.Id, mainGroupData.Name)}) →  ${mainGroupData.Role}`

            if (alliedGroupsData.length === 4) alliedField = alliedField.concat("\n", "To see more groups, use the /allies command")
            if (enemiedGroupsData.length === 4) enemyField = enemyField.concat("\n", "To see more groups, use the /enemies command")

            // Checks if field contains a string to avoid discord.js error and adds to field
            if (mainField !== '') { addField(`Main Group`, mainField) }
            if (alliedField !== '') { addField(`Allied Groups`, alliedField) }
            if (enemyField !== '') { addField(`Enemied Groups`, enemyField) }
            if (userData.blurb === '') { addField(`Description`, "No description avalible") } else { addField(`Description`, userData.blurb) }

            addField(`Created On`, userData.joinDate.toLocaleDateString())

            whoisEmbed.addFields(embedFields) // Sets the embedFields array to the replyEmbed

            await interaction.editReply({ embeds: [whoisEmbed] });
        } catch (err) {
            console.log(err)
            interaction.editReply({ content: err.message});
        }
    },
};