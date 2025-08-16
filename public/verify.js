// verify.js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Get the verification link"),

    async execute(interaction) {
        // Send the verification link directly in the channel
        await interaction.channel.send(
            `<@${interaction.user.id}> Click here to verify: https://yoursite.com/verify`
        );

        // Acknowledge the slash command without showing anything extra
        await interaction.reply({ content: "Verification link sent!", ephemeral: true });
    }
};
