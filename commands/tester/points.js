const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const nobloxServer = require('noblox.js')
const axios = require("axios");
const { getAuthToken, getPlayerData, getGroupData, updatePlayerData } = require('../functions/discordSave');

let getUserData = async function (id) {
    let res = null;
    try {
        const data = await axios.get("https://users.roblox.com/v1/users/" + id);
        if (typeof data.data.id !== 'undefined') res = data.data;
    } finally {
        return res
    }
}

module.exports = class GroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'points',
            group: 'tester',
            memberName: 'points',
            description: 'Gets points information of player.',
        });
    }

    run(message) {
        //functions
        function bounceCommand(errorMessage, botMessage) {
            var embed = new Discord.MessageEmbed()
                .setColor("RED")
                .addField("Command Failed", errorMessage)
            if (botMessage !== undefined) {
                botMessage.edit(embed)
            } else {
                message.channel.send(embed);
            }
        }

        let getThumbnail = async function (ID) {
            try {
                const data = await axios.get(
                    "https://thumbnails.roblox.com/v1/users/avatar?userIds=" + ID + "&size=420x420&format=Png&isCircular=false"
                );
                let url
                for (const tbl of data.data.data) {
                    url = tbl.imageUrl
                }
                return url;
            } catch (error) {
                console.log("error", error);
            }
        }

        const args = message.content.slice(1).split(" ");
        var name
        if (args.length == 1 && message.channel.type == 'text') {
            name = message.member.displayName
        } else {
            if (args.length <= 1) {
                bounceCommand("Not enough arguments have been givin for this command!")
                return
            };
            if (args[1].startsWith("<@!")) {
                var user = message.mentions.members.first()
                name = user.nickname
            } else {
                name = args[1]
            }
        }

        if (message.channel.type == 'dm') {
            bounceCommand("This command can not be run in DMs.")
            return
        }
        const loadingEmbed = new Discord.MessageEmbed()
            .setTitle("Loading...")
            .setColor('BLUE')
            .setTimestamp()
        message.say(loadingEmbed).then(botMessage => {
            getGroupData(message.guild.id).then(groupData => {
                nobloxServer.getIdFromUsername(name).then(id => {
                    getUserData(id).then(userData => {
                        getAuthToken(message.guild.id).then(token => {
                            getPlayerData(token, id).then(playerData => {
                                if (userData === null) {
                                    bounceCommand("Player not found!", botMessage)
                                    return
                                } else if (token == null) {
                                    bounceCommand("Discord server has no group linked!", botMessage)
                                    return    
                                } else if (playerData == null) {
                                    bounceCommand("Player not found in database!", botMessage)
                                    return                      
                                }
                                const id = userData.id

                                getThumbnail(id).then(url => {
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
                                    var linkEmbed = new Discord.MessageEmbed()
                                        .setColor('BLUE')
                                        .setTitle('Points Information! 🔍')
                                        .setTimestamp()
                                        .setThumbnail(url)
                                        .addField(`Username`, `[${userData.name}](https://www.roblox.com/users/${id}/profile)`, true)
                                        .addField(`User ID`, id, true)
                                        .addField(`**100%** | 👑👑👑👑👑👑👑👑👑 | \`${playerData.rank} (🔒)\``, `\n**0** Honor remaining for next rank \n\n**Rank:** \`${playerData.rank}\`\n**Points:** \`${playerData.points}\``)
                                        .setFooter(`${message.author.tag} has successfully checked ${name}'s points`)
                                    botMessage.edit(linkEmbed)
                                });
                            });
                        });
                    });
                }).catch(err => {
                    bounceCommand("Player not found...", botMessage)
                    return
                })
            });
        });
    }
};