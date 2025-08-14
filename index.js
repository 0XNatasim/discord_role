import express from "express";
import { Client, GatewayIntentBits, Routes } from "discord.js";
import { REST } from "@discordjs/rest";
import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Discord Bot Setup ----
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once("ready", () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// Commande /verify
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      {
        body: [
          {
            name: "verify",
            description: "Vérifie que vous possédez un subdomain ENS"
          }
        ]
      }
    );
    console.log("✅ Commande /verify enregistrée");
  } catch (error) {
    console.error(error);
  }
})();

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "verify") {
    const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
    
    // Réponse immédiate pour éviter l'erreur 10062
    await interaction.reply({ content: "🔗 Génération du lien...", ephemeral: true });

    // Si tu veux faire un traitement après, utilise followUp
    await interaction.followUp(`Voici votre lien de vérification : ${link}`);
  }
});

// ---- Express Server ----
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/verify-wallet", async (req, res) => {
  const { discordId, walletAddress } = req.body;
  if (!discordId || !walletAddress) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`);
    const abi = ["function balanceOf(address account, uint256 id) view returns (uint256)"];
    const contract = new ethers.Contract(process.env.ENS_WRAPPER_NFT_CONTRACT, abi, provider);

    const balance = await contract.balanceOf(walletAddress, process.env.PARENT_NODE);

    if (balance > 0n) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(discordId);
      await member.roles.add(process.env.MEMBER_ROLE_ID);

      return res.json({ success: true, message: "✅ Vous avez été vérifié et le rôle ajouté." });
    } else {
      return res.json({ success: false, message: "❌ Aucun subdomain ENS trouvé." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🌍 Serveur Web lancé sur le port ${process.env.PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
