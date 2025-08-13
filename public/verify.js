const discordId = new URLSearchParams(window.location.search).get("discordId");

document.getElementById("connect").addEventListener("click", async () => {
  if (!window.ethereum) {
    document.getElementById("status").innerText = "❌ Installez MetaMask";
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const wallet = accounts[0];

    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [`Vérification pour Discord ID: ${discordId}`, wallet]
    });

    // Envoyer au backend
    const res = await fetch("/api/verify-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId, walletAddress: wallet })
    });
    const data = await res.json();
    document.getElementById("status").innerText = data.message;
  } catch (err) {
    document.getElementById("status").innerText = "❌ Erreur lors de la connexion.";
    console.error(err);
  }
});
