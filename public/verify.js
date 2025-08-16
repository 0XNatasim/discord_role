app.post("/api/verify-signature", async (req, res) => {
  try {
    const { discordId, wallet, signature, message } = req.body;

    if (!discordId || !wallet || !signature || !message) {
      return res.status(400).json({ message: "❌ Paramètres manquants" });
    }

    // Verify signature
    const recovered = ethers.verifyMessage(message, signature);
    console.log("Recovered address:", recovered);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ message: "❌ Signature invalide" });
    }

    // Get NFTs from Alchemy
    const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${process.env.ALCHEMY_KEY}/getNFTs/` +
      `?owner=${wallet}&contractAddresses[]=${process.env.ENS_WRAPPER_NFT_CONTRACT}`;

    const nftRes = await fetch(url);
    const nftData = await nftRes.json();

    if (!nftData.ownedNfts || nftData.ownedNfts.length === 0) {
      return res.status(403).json({ message: "❌ Aucun NFT ENS trouvé" });
    }

    // Check for subdomains under the parent node
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
