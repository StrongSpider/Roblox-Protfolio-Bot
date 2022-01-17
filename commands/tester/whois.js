const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const nobloxServer = require('noblox.js')
const axios = require("axios");
const { getGroupData } = require('../functions/discordSave')

//WHY IS THIS NOT IN NOBLOX
let getUserData = async function (ID) {
    try {
        const data = await axios.get(
            "https://users.roblox.com/v1/users/" + ID
        );
        if (data.data.id !== undefined) {
            return data.data;
        } else {
            return false;
        }
    } catch (error) {
        console.log("error", error);
    }
}

let getUserThumbnail = async function (ID) {
    try {
        const data = await axios.get(
            "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + ID + "&size=720x720&format=Png&isCircular=false"
        );
        return data.data.data;
    } catch (error) {
        console.log("error", error);
    }
}
let getGroupRelationships = async function (groupId, type) {
    try {
        const data = await axios.get(
            "https://groups.roblox.com/v1/groups/" + groupId + "/relationships/" + type + "?model.startRowIndex=0&model.maxRows=1000"
        );
        return data.data;
    } catch (error) {
        console.log("error", error);
    }
}

module.exports = class InfoCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'whois',
            group: 'tester',
            memberName: 'whois',
            description: 'Gets information on player.',
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
        const loadingEmbed = new Discord.MessageEmbed()
            .setTitle("Loading...")
            .setColor('BLUE')
            .setTimestamp()
        message.say(loadingEmbed).then(botMessage => {
            nobloxServer.getIdFromUsername(name).then(userId => {
                if (userId == false) {
                    bounceCommand("Player not found!", botMessage)
                    return;
                }

                //Collects Data
                getUserData(userId).then(userData => {
                    nobloxServer.getGroups(userId).then(groupData => {
                        getUserThumbnail(userId).then(userThumbnail => {
                            var whoisEmbed = new Discord.MessageEmbed()
                                .setColor('BLUE')
                                .setTitle(userData.name + ' 🔎')
                                .setAuthor(message.author.tag, message.author.avatarURL())
                                .setTimestamp()
                                .addField(`Username`, `[${userData.name}](https://www.roblox.com/users/${userId}/profile)`, true)
                                .addField(`User ID`, userId, true)
                            for (let data of userThumbnail) {
                                whoisEmbed.setThumbnail(data.imageUrl)
                            }

                            getGroupData(message.guild.id).then(discordGroupData => {
                                let groupId
                                if (discordGroupData === null){ groupId = 2 } else { groupId = discordGroupData.id }
                                getGroupRelationships(groupId, "allies").then((allyData) => {
                                    getGroupRelationships(groupId, "enemies").then((enemyData) => {
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

                                        var allyField = ''
                                        var enemyField = ''
                                        var mainField = ''

                                        for (let group of allyData.relatedGroups) {
                                            for (let playerGroup of groupData) {
                                                if (group.id == playerGroup.Id) {
                                                    allyField = allyField + `\n[${group.name}](${makeLink(group.id, group.name)}) →  ${playerGroup.Role}`
                                                    break;
                                                }
                                            }
                                        }
                                        for (let group of enemyData.relatedGroups) {
                                            for (let playerGroup of groupData) {
                                                if (group.id == playerGroup.Id) {
                                                    enemyField = enemyField + `\n[${group.name}](${makeLink(group.id, group.name)}) →  ${playerGroup.Role}`
                                                    break;
                                                }
                                            }
                                        }

                                        for (let playerGroup of groupData) {
                                            if (groupId == playerGroup.Id) {
                                                mainField = `[${playerGroup.Name}](${makeLink(playerGroup.Id, playerGroup.Name)}) →  ${playerGroup.Role}`
                                                break;
                                            }
                                        }

                                        if (mainField !== '') { whoisEmbed.addField(`Main Group`, mainField) }
                                        if (allyField !== '') { whoisEmbed.addField(`Allied Groups`, allyField) }
                                        if (enemyField !== '') { whoisEmbed.addField(`Enemied Groups`, enemyField) }
                                        if (userData.description === '') { userData.description = 'No description was found' }
                                        whoisEmbed.addField(`Created On`, new Date(userData.created).toLocaleDateString())
                                        whoisEmbed.addField(`Description`, userData.description)
                                        botMessage.edit(whoisEmbed)
                                    })
                                })
                            })
                        })
                    });
                });
            });
        });
    }
};