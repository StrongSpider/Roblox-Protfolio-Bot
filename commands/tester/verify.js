const { Command } = require('discord.js-commando');
const Discord = require("discord.js");
const axios = require("axios");
const { getRobloxId } = require('../functions/discordSave');

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
            name: 'verify',
            group: 'tester',
            memberName: 'verify',
            description: 'Verifys users discord account.',
        });
    }

    run(message) {
        const bounceMessage = function (errorMessage, botMessage) {
            var embed = new Discord.MessageEmbed()
                .setColor("RED")
                .addField("Command Failed", errorMessage)
            if (typeof botMessage !== 'undefined') {
                botMessage.edit(embed)
            } else {
                message.channel.send(embed);
            }
        }

        getRobloxId(message.member.user.id).then(robloxid => {
            if (robloxid !== null) return bounceMessage(`Your account has been verified by another account.\nUserId: ${robloxid}`);
            
        });
    }
};