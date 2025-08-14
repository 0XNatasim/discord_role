import express from "express";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const __dirname = path.resolve();

// ----------- Discord Bot Setup -----------
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

// Register slash command /verify
const commands = [
  {
    name: "verify",
    description: "Vérifiez votre wallet ENS pour obtenir le rôle Club"
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commande /verify enregistrée");
  } catch (err) {
    console.error(err);
  }
})();

// ----------- Interaction Handler -----------
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {
    try {
      const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
      // Réponse immédiate à Discord
      await interaction.reply({
        content: `🔗 Cliquez ici pour vérifier votre ENS : ${link}`,
        flags: 64 // ephemeral
      });
    } catch (err) {
      console.error("Erreur interaction : ", err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

// ----------- Express Server Setup -----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Page verification
app.get("/", (req, res) => {
  const { discordId } = req.query;
  if (!discordId) return res.send("❌ Discord ID manquant");

  // Ici, la page public/verify.js peut récupérer discordId et demander signature Metamask
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`🌍 Serveur Web lancé sur le port ${process.env.PORT || 5000}`);
});
