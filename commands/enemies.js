const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, MessageActionRow, MessageButton } = require('discord.js');
const { getDiscordData, tokenFromGuild } = require('../functions/saveModule.js');

const noblox = require('noblox.js');
const axios = require("axios");
const maxPages = 10

async function getRelationship(groupId, relationship, playerGroups) {
    let res = [];
    try {
        const data = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=0&model.maxRows=1`)

        const totalGroupCount = data.data.totalGroupCount
        const modifiedNumber = Math.floor(totalGroupCount / maxPages)

        var currentPage = []
        if (modifiedNumber == 0) {
            const newPageData = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=0&model.maxRows=${maxPages}`)
            for (var group of newPageData.data.relatedGroups) {
                for (let playerGroup of playerGroups) {
                    if (group.id == playerGroup.Id) {
                        currentPage.push(playerGroup)
                        break;
                    }
                }
            }
        } else {
            for (let i = 0; i < Math.floor(totalGroupCount / maxPages); i++) {
                const newPageData = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/relationships/${relationship}?model.startRowIndex=${i * maxPages}&model.maxRows=${maxPages}`)
                for (var group of newPageData.data.relatedGroups) {
                    for (let playerGroup of playerGroups) {
                        if (group.id == playerGroup.Id) {
                            if (currentPage.length == maxPages) {
                                res.push(currentPage); currentPage = []; currentPage.push(playerGroup)
                            } else currentPage.push(playerGroup)
                            break;
                        }
                    }
                }
            }
        } res.push(currentPage)
    } finally {
        return res;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enemies')
        .setDescription('Gets group enemied information on player.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Gets group enemied information from the provided discord user.')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('Target user.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('username')
                .setDescription('Gets group enemied information from the provided roblox username.')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Target player username.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('userid')
                .setDescription('Gets group enemied information from the provided roblox userid.')
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

        const firebasetoken = await tokenFromGuild(interaction.guild.id)
	    const discordData = await getDiscordData(firebasetoken)

        const userGroups = await noblox.getGroups(userid)
        const enemiedGroupsData = await getRelationship(discordData.roblox_group_id, "Enemies", userGroups)

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

        //Discord.js v14 hack
        const embedFields = []
        const addField = (name, value, inline) => {
            inline = inline || false
            embedFields.push({ name: name, value: value, inline: inline})
        }

        function createPage(page) {
            var replyEmbed = new EmbedBuilder()
                .setFooter({ text: `Pages: ${page + 1}/${enemiedGroupsData.length}` })
                .setThumbnail(thumbnailURL[0].imageUrl)
                .setTitle(userData.username + "'s Enemied Connections 🔎")
                .setColor([0, 155, 255])
                .setTimestamp()

            for (var playerGroup of enemiedGroupsData[page]) {
                addField(playerGroup.Name, `**Rank: **${playerGroup.Role}\n[Group Link](${makeLink(playerGroup.Id, playerGroup.Name)})\n`, true)
            }

            replyEmbed.addFields(embedFields)
            return replyEmbed;
        }

        const replyRow = new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setCustomId('prev')
                    .setLabel('⬅')
                    .setStyle('SECONDARY')
                    .setDisabled(true),
                new MessageButton()
                    .setCustomId('next')
                    .setLabel('➡')
                    .setStyle('SECONDARY'),
            ]);

        if (enemiedGroupsData.length > 0) {
            if (enemiedGroupsData.length == 1) {
                await interaction.reply({ embeds: [createPage(0)] })
            } else {
                await interaction.reply({ embeds: [createPage(0)], components: [replyRow] })
            }

            const filter = i => i.user.id === interaction.user.id;
            const initalCollector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            var pageCount = 0
            initalCollector.on('collect', async i => {
                if (i.customId === 'prev') {
                    pageCount -= 1;

                    var prev = new MessageButton()
                        .setCustomId('prev')
                        .setLabel('⬅')
                        .setStyle('SECONDARY')

                    if (pageCount === 0) prev.setDisabled(true);

                    const replyRow = new MessageActionRow()
                        .addComponents([
                            prev,
                            new MessageButton()
                                .setCustomId('next')
                                .setLabel('➡')
                                .setStyle('SECONDARY'),
                        ]);

                    await i.update({ embeds: [createPage(pageCount)], components: [replyRow] });
                } else if (i.customId === 'next') {
                    pageCount += 1;

                    var next = new MessageButton()
                        .setCustomId('next')
                        .setLabel('➡')
                        .setStyle('SECONDARY')

                    if (pageCount + 1 == enemiedGroupsData.length) next.setDisabled(true);

                    const replyRow = new MessageActionRow()
                        .addComponents([
                            new MessageButton()
                                .setCustomId('prev')
                                .setLabel('⬅')
                                .setStyle('SECONDARY'),
                            next
                        ]);

                    await i.update({ embeds: [createPage(pageCount)], components: [replyRow] });
                }
            });

            initalCollector.on('end', _ => interaction.editReply({ embeds: [createPage(pageCount)] }));
        } else await interaction.reply({ content: 'I could not find any enemied groups connected to the main discord group that has a relationship with the selected user!', ephemeral: true })
    },
};