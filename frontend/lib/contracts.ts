// frontend/lib/contracts.ts
import { ethers } from "ethers";

// Load from public/
const loadDeployment = async () => {
  const [addrRes, abiRes] = await Promise.all([
    fetch("/deployment-info.json"),
    fetch("/abis.json")
  ]);
  const addresses = await addrRes.json();
  const abis = await abiRes.json();
  return { addresses, abis };
};

// Get provider & signer
export const getProvider = () => {
  if (!window.ethereum) throw new Error("No wallet installed");
  return new ethers.BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
};

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Contract getters
export const getUSDC = async (signer: ethers.Signer) => {
  const { addresses } = await loadDeployment();
  return new ethers.Contract(addresses.contracts.usdc, USDC_ABI, signer);
};

export const getTreasury = async (signer: ethers.Signer) => {
  const { addresses, abis } = await loadDeployment();
  return new ethers.Contract(addresses.contracts.treasury, abis.Treasury, signer);
};

export const getStreamFactory = async (signer: ethers.Signer) => {
  const { addresses, abis } = await loadDeployment();
  return new ethers.Contract(addresses.contracts.streamFactory, abis.StreamFactory, signer);
};