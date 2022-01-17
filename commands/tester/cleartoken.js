const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const { getGroupData, generateNewAuthToken } = require('../functions/discordSave');

module.exports = class GroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'cleartoken',
            group: 'tester',
            memberName: 'cleartoken',
            description: 'Clears old game token and gives new one.',
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

        getGroupData(message.guild.id).then(groupData => {
            if (groupData == null) {
                bounceCommand("A group needs to be setup for this command to run!")
                return
            }
            if (message.channel.type == 'dm') {
                bounceCommand("This command can not be run in DMs.")
                return
            }

            if (message.member !== message.guild.owner) {
                bounceCommand("This command can only be run by the owner of this guild!")
                return
            }

            let groupId = groupData.id
            const replyEmbed = new Discord.MessageEmbed()
                .setDescription(`Hey ${message.member.displayName}, this is some top secret information so lets take this in DMs!`)
                .setColor('BLUE')
            message.say(replyEmbed)

            const token = generateNewAuthToken(groupId)
            const dmEmbed = new Discord.MessageEmbed()
                .setTitle("WARNING: THIS SHOULD NOT BE SHARED WITH ANYONE")
                .setColor('BLUE')
                .setTimestamp()
                .addField("Token", "||" + token + "||")
                .addField("REMINDER", "This auth token is key to link your game to our database on your group. This is highly sensitive information so try not to share this token with anyone.")
            message.author.send(dmEmbed)
        });
    }
};