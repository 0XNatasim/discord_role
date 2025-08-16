import express from "express";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

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
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
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
      const link = `${process.env.BASE_URL}/?discordId=${interaction.user.id}`;
      await interaction.reply({
        content: `🔗 Cliquez ici pour vérifier votre ENS : ${link}`,
        flags: 64, // ephemeral
      });
    } catch (err) {
      console.error("Erreur interaction : ", err);
    }
  }
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() =>
    console.log(`🤖 Bot connecté en tant que ${client.user.tag}`)
  )
  .catch((err) =>
    console.error("❌ Erreur de connexion du bot:", err)
  );

// ----------- Express Server Setup -----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  const { discordId } = req.query;
  if (!discordId) return res.send("❌ Discord ID manquant");
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ----------- ENS ERC-1155 Contract Setup -----------
const provider = new ethers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
);

const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
];

const ensWrapperContract = new ethers.Contract(
  process.env.ENS_WRAPPER_NFT_CONTRACT,
  ERC1155_ABI,
  provider
);

app.post("/api/verify-signature", async (req, res) => {
  try {
    const { discordId, wallet, signature, message } = req.body;

    if (!discordId || !wallet || !signature || !message) {
      return res.status(400).json({ message: "❌ Paramètres manquants" });
    }

    const recovered = ethers.verifyMessage(message, signature);
    console.log("Recovered address:", recovered);

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ message: "❌ Signature invalide" });
    }

    const tokenId = ethers.toBigInt(process.env.PARENT_NODE);
    const balance = await ensWrapperContract.balanceOf(wallet, tokenId);
    console.log(`Balance ENS Token for ${wallet}:`, balance.toString());

    if (balance <= 0n) {
      return res
        .status(403)
        .json({ message: "❌ Ce wallet ne possède pas le NFT ENS requis" });
    }

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
}
