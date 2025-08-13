import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(
  `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
);

provider.getBlockNumber()
  .then(block => console.log(`✅ Alchemy OK, dernier bloc: ${block}`))
  .catch(err => console.error("❌ Problème Alchemy:", err));