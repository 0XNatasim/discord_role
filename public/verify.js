// public/verify.js

const connectBtn = document.getElementById("connectBtn");

connectBtn.onclick = async () => {
  if (!window.ethereum) {
    console.error("❌ MetaMask non détecté");
    return alert("Veuillez installer MetaMask pour continuer.");
  }

  try {
    console.log("🔹 Étape 1: Demande de connexion au portefeuille...");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const wallet = accounts[0];
    console.log("✅ Wallet connecté :", wallet);

    console.log("🔹 Étape 2: Récupération du Discord ID depuis l'URL...");
    const params = new URLSearchParams(window.location.search);
    const discordId = params.get("discordId");
    console.log("Discord ID trouvé :", discordId);
    if (!discordId) {
      console.error("❌ Discord ID manquant dans l'URL");
      return alert("Discord ID manquant dans l'URL");
    }

    console.log("🔹 Étape 3: Création du message à signer...");
    const message = `Vérification Discord ENS\nDiscord ID: ${discordId}\nWallet: ${wallet}\nDate: ${new Date().toISOString()}`;
    console.log("Message à signer :", message);

    console.log("🔹 Étape 4: Demande de signature à MetaMask...");
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [message, wallet],
    });
    console.log("✅ Signature reçue :", signature);

    console.log("🔹 Étape 5: Envoi des données au serveur...");
    const payload = { discordId, wallet, signature, message };
    console.log("Payload envoyé :", payload);

    const res = await fetch("/api/verify-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📡 Statut réponse serveur :", res.status);
    let result;
    try {
      result = await res.json();
      console.log("📦 Réponse JSON serveur :", result);
    } catch (parseErr) {
      console.error("❌ Erreur lors de l'analyse JSON :", parseErr);
      result = { message: "Réponse serveur invalide" };
    }

    alert(result.message);
  } catch (err) {
    console.error("💥 Erreur lors de la vérification :", err);
    alert("Erreur de connexion ou de signature");
  }
};
