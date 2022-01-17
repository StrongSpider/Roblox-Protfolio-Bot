const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const nobloxServer = require('noblox.js')
const axios = require("axios");
const { getGroupData, getAuthToken } = require('../functions/discordSave');

module.exports = class GroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'linkgame',
            group: 'tester',
            memberName: 'linkgame',
            description: 'Gives a custom auth token to link the api.',
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

        let groupId = getGroupData(message.guild.id).id

        const args = message.content.slice(1).split(" ");
        if (message.channel.type == 'dm') {
            bounceCommand("This command can not be run in DMs.")
            return
        }

        if (message.member !== message.guild.owner) {
            bounceCommand("This command can only be run by the owner of this guild!")
            return
        }

        if (groupId == 1) {
            bounceCommand("A group needs to be setup for this command to run!")
            return
        }

        const replyEmbed = new Discord.MessageEmbed()
            .setDescription(`Hey ${message.member.displayName}, this is some top secret information so lets take this in DMs!`)
            .setColor('BLUE')
        message.say(replyEmbed)

        getAuthToken(message.guild.id).then((token) => {
            const dmEmbed = new Discord.MessageEmbed()
                .setTitle("WARNING: THIS SHOULD NOT BE SHARED WITH ANYONE")
                .setColor('BLUE')
                .setTimestamp()
                .addField("Token", "||" + token + "||")
                .addField("Instructions", "This auth token is key to link your game to our database on your group. This is highly sensitive information so try not to share this token with anyone. If your token is compromised, use the !cleartoken command. \n\nTo set up the API, download the attached file and put it in ServerScriptService in your game. Then open your file and paste your auth token in the 'token' variable.")

            message.author.send(dmEmbed)
        });
    }
};