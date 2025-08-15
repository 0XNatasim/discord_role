const connectBtn = document.getElementById("connectBtn");

connectBtn.onclick = async () => {
  if (!window.ethereum) {
    return alert("Veuillez installer MetaMask pour continuer.");
  }

  try {
    // Get discordId from query param
    const urlParams = new URLSearchParams(window.location.search);
    const discordId = urlParams.get("discordId");
    if (!discordId) {
      return alert("Discord ID manquant dans l'URL.");
    }

    console.log("🔹 Étape 1: Demande de connexion au portefeuille...");
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const walletAddress = accounts[0];
    console.log("✅ Wallet connecté:", walletAddress);

    console.log("🔹 Étape 2: Préparation du message à signer...");
    const message = `
Vérification Discord ENS
Discord ID: ${discordId}
Wallet: ${walletAddress}
Date: ${new Date().toISOString()}
    `.trim();

    console.log("🔹 Étape 3: Signature du message...");
    const signature = await ethereum.request({
      method: "personal_sign",
      params: [message, walletAddress]
    });

    console.log("✅ Signature obtenue:", signature);

    console.log("🔹 Étape 4: Envoi au backend pour vérification ENS...");
    const res = await fetch("/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId, walletAddress, signature })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Vérification réussie ! Le rôle a été attribué sur Discord.");
    } else {
      alert(`❌ ${data.error || "La vérification a échoué"}`);
    }

  } catch (err) {
    console.error("❌ Erreur:", err);
    alert("Une erreur est survenue. Vérifiez la console.");
  }
};
