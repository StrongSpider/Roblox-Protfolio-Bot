const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const nobloxServer = require('noblox.js')
const axios = require("axios");
const { createNewGroup, getGroupData, setGroupData } = require('../functions/discordSave');

module.exports = class GroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'setgroup',
            group: 'tester',
            memberName: 'setgroup',
            description: 'Sets the roblox group tied to the discord server.',
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
                  "https://thumbnails.roblox.com/v1/groups/icons?groupIds="+ ID + "&size=420x420&format=Png&isCircular=false"
                );
                let url
                for (let tbl of data.data.data){
                    url = tbl.imageUrl
                }
                return url;
              } catch (error) {
                console.log("error", error);
              }
        }
        
        const args = message.content.slice(1).split(" ");
        if (args.length < 2) {
            bounceCommand("Not enough arguments have been givin for this command!")
            return
        } else if (message.channel.type == 'dm') {
            bounceCommand("This command can not be run in DMs.")
            return
        }

        var id = parseFloat(args[1])
        if (id == NaN) {
            bounceCommand("Argument 1 must be a number.")
            return
        }

        const loadingEmbed = new Discord.MessageEmbed()
            .setTitle("Loading...")
            .setColor('BLUE')
            .setTimestamp()
        message.say(loadingEmbed).then(botMessage => {
            nobloxServer.getGroup(id).then(groupData => {
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
                        .setTitle('Successfully linked to this guild! ✔')
                        .setTimestamp()
                        .setThumbnail(url)
                        .addField(`Roblox Group Name`, `[${groupData.name}](${makeLink(id, groupData.name)})`, true)
                        .addField(`Roblox Group ID`, groupData.id, true)
                        .addField(`Roblox Group Owner`, groupData.owner.username,true)
                        .addField(`Discord Guild Name`, message.guild.name, true)
                        .addField(`Discord Guild ID`, message.guild.id, true)
                        .addField(`Discord Guild Owner`, message.guild.owner.displayName, true)
                        .setFooter(`${message.author.tag} has successfully linked this server to group ${id}`)
                    botMessage.edit(linkEmbed)
                    getGroupData(message.guild.id).then(oldGroupData => {
                        if (oldGroupData !== null) {
                            setGroupData(message.guild.id, groupData)
                        } else {
                            createNewGroup(message.guild.id, groupData)
                        }
                    })
                })
            }).catch(function (err) {
                console.log(err)
                bounceCommand("Group not found.", botMessage)
            })
        });
    }
};