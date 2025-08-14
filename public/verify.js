client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "verify") {
    try {
      const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
      
      // Réponse immédiate (évite l'erreur 10062)
      await interaction.reply({
        content: `🔗 Cliquez ici pour vérifier votre ENS : ${link}`,
        flags: 64  // ephemeral message
      });

      // Tout traitement long se fait après dans la page web / serveur
    } catch (err) {
      console.error("Erreur interaction : ", err);
    }
  }
});
