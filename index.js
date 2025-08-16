import express from "express";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import fetch from "node-fetch";

dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------- Discord Bot Setup -----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

const commands = [
  {
    name: "verify",
    description: "Vérifiez votre wallet ENS pour obtenir le rôle Club",
  },
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "verify") {
    try {
      if (interaction.replied || interaction.deferred) return; // avoid duplicates
      const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
      await interaction.reply({
        content: `🔗 Cliquez ici pour vérifier votre ENS : ${link}`,
        flags: 64 // ephemeral
      });
    } catch (err) {
      console.error("Erreur interaction : ", err);
    }
  }
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => console.log(`🤖 Bot connecté en tant que ${client.user.tag}`))
  .catch((err) => console.error("❌ Erreur de connexion du bot:", err));

// ----------- Express Server Setup -----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  const { discordId } = req.query;
  if (!discordId) return res.send("❌ Discord ID manquant");
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ----------- ENS Subdomain Verification with Alchemy -----------
app.post("/api/verify-signature", async (req, res) => {
  try {
    const { discordId, wallet, signature, message } = req.body;

    if (!discordId || !wallet || !signature || !message) {
      return res.status(400).json({ message: "❌ Paramètres manquants" });
    }

    // Verify wallet signature
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ message: "❌ Signature invalide" });
    }

    // Fetch wallet NFTs from Alchemy
    const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${process.env.ALCHEMY_KEY}/getNFTs/` +
                `?owner=${wallet}&contractAddresses[]=${process.env.ENS_WRAPPER_NFT_CONTRACT}`;

    const nftRes = await fetch(url);
    const nftData = await nftRes.json();

    if (!nftData.ownedNfts || nftData.ownedNfts.length === 0) {
      return res.status(403).json({ message: "❌ Aucun NFT ENS trouvé" });
    }

    // Check if any NFT is a subdomain of parent
    const parentLabel = process.env.PARENT_LABEL?.toLowerCase(); // e.g., "emperor.club.agi.eth"
    const ownsSubname = nftData.ownedNfts.some(nft => {
      return nft.title?.toLowerCase().endsWith(`.${parentLabel}`);
    });

    if (!ownsSubname) {
      return res.status(403).json({ message: "❌ Ce wallet ne possède pas de sous-domaine ENS valide" });
    }

    // Add Discord role
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);
    await member.roles.add(process.env.MEMBER_ROLE_ID);

    return res.json({ message: "✅ Vérification réussie, rôle attribué" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🌍 Serveur Web lancé sur le port ${port}`);
});

// ----------- Self-Ping to keep Render awake -----------
if (process.env.BASE_URL) {
  setInterval(() => {
    fetch(process.env.BASE_URL)
      .then(() => console.log("⏳ Self-ping sent to keep service awake"))
      .catch((err) => console.error("⚠️ Self-ping failed:", err));
  }, 14 * 60 * 1000); // every 14 minutes
};
