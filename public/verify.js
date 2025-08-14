// public/verify.js

const connectBtn = document.getElementById("connectBtn");

connectBtn.onclick = async () => {
  if (!window.ethereum) {
    return alert("Veuillez installer MetaMask pour continuer.");
  }

  try {
    // 1. Connect wallet
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const wallet = accounts[0];
    console.log("Wallet connecté :", wallet);

    // 2. Get Discord ID from URL
    const params = new URLSearchParams(window.location.search);
    const discordId = params.get("discordId");
    if (!discordId) {
      return alert("Discord ID manquant dans l'URL");
    }

    // 3. Create message to sign
    const message = `Vérification Discord ENS\nDiscord ID: ${discordId}\nWallet: ${wallet}\nDate: ${new Date().toISOString()}`;

    // 4. Request signature from MetaMask
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [message, wallet],
    });

    console.log("Signature reçue :", signature);

    // 5. Send to server for verification
    const res = await fetch("/api/verify-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId, wallet, signature, message }),
    });

    const result = await res.json();
    alert(result.message);
  } catch (err) {
    console.error(err);
    alert("Erreur de connexion ou de signature");
  }
};
