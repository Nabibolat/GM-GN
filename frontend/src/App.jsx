import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Sun, Moon, Wallet, ChevronDown, ExternalLink, CheckCircle2, AlertCircle, LoaderCircle, Network } from "lucide-react";

const NETWORKS = {
  8453: {
    id: 8453, hex: "0x2105", name: "Base Mainnet", symbol: "ETH",
    rpc: "https://mainnet.base.org", explorer: "https://basescan.org",
    contract: import.meta.env.VITE_GMGN_BASE_ADDRESS || ""
  },
  4441: {
    id: 4441, hex: "0x1159", name: "LitVM Testnet", symbol: "zkLTC",
    rpc: "https://liteforge.rpc.caldera.xyz/http", explorer: "https://liteforge.explorer.caldera.xyz",
    contract: import.meta.env.VITE_GMGN_LITVM_ADDRESS || ""
  }
};

const ABI = [
  "function sayGM() external",
  "function sayGN() external",
  "function totalGM() view returns (uint256)",
  "function totalGN() view returns (uint256)",
  "function gmCount(address) view returns (uint256)",
  "function gnCount(address) view returns (uint256)",
  "event GM(address indexed sender, uint256 timestamp)",
  "event GN(address indexed sender, uint256 timestamp)"
];

function shortAddress(value) {
  return value ? value.slice(0, 6) + "..." + value.slice(-4) : "";
}

export default function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [counts, setCounts] = useState({ gm: "—", gn: "—" });
  const [history, setHistory] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const network = NETWORKS[chainId];
  const contractAddress = network?.contract;
  const configured = Boolean(contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress));

  async function refreshWallet() {
    if (!window.ethereum) return;
    try {
      const [accounts, chain] = await Promise.all([
        window.ethereum.request({ method: "eth_accounts" }),
        window.ethereum.request({ method: "eth_chainId" })
      ]);
      setAccount(accounts?.[0] || "");
      setChainId(Number.parseInt(chain, 16));
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    refreshWallet();
    if (!window.ethereum) return;
    const onAccounts = (accounts) => setAccount(accounts?.[0] || "");
    const onChain = (chain) => { setChainId(Number.parseInt(chain, 16)); setNotice(null); };
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!network || !configured) { setCounts({ gm: "—", gn: "—" }); return; }
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(contractAddress, ABI, provider);
        const [gm, gn] = await Promise.all([contract.totalGM(), contract.totalGN()]);
        if (!cancelled) setCounts({ gm: gm.toString(), gn: gn.toString() });
      } catch { if (!cancelled) setCounts({ gm: "—", gn: "—" }); }
    }
    loadCounts();
    return () => { cancelled = true; };
  }, [network, configured, contractAddress, chainId]);

  async function connectWallet() {
    setNotice(null);
    if (!window.ethereum) {
      setNotice({ type: "error", text: "MetaMask не найден. Установите MetaMask и обновите страницу." });
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      setAccount(accounts?.[0] || "");
      setChainId(Number.parseInt(chain, 16));
    } catch (error) {
      setNotice({ type: "error", text: error?.code === 4001 ? "Подключение отклонено в кошельке." : (error.message || "Не удалось подключить кошелёк.") });
    }
  }

  async function switchNetwork(id) {
    setMenuOpen(false);
    setNotice(null);
    if (!window.ethereum) { setNotice({ type: "error", text: "Сначала установите MetaMask." }); return; }
    const target = NETWORKS[id];
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target.hex }] });
    } catch (error) {
      if (error?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: target.hex, chainName: target.name,
              nativeCurrency: { name: target.symbol, symbol: target.symbol, decimals: 18 },
              rpcUrls: [target.rpc], blockExplorerUrls: [target.explorer]
            }]
          });
        } catch (addError) {
          setNotice({ type: "error", text: addError.message || "Не удалось добавить сеть." });
        }
      } else {
        setNotice({ type: "error", text: error.message || "Не удалось переключить сеть." });
      }
    }
    await refreshWallet();
  }

  async function sendGreeting(kind) {
    setNotice(null);
    if (!account) { await connectWallet(); return; }
    if (!network) { setNotice({ type: "error", text: "Выберите Base Mainnet или LitVM Testnet." }); return; }
    if (!configured) {
      setNotice({ type: "error", text: `Контракт для сети ${network.name} ещё не задеплоен или адрес не указан в frontend/.env.` });
      return;
    }
    try {
      setBusy(kind);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, ABI, signer);
      const tx = await (kind === "GM" ? contract.sayGM() : contract.sayGN());
      setNotice({ type: "pending", text: "Транзакция отправлена. Ожидаем подтверждения в блокчейне…", hash: tx.hash });
      const receipt = await tx.wait();
      setHistory((items) => [{ kind, hash: tx.hash, block: receipt.blockNumber, time: new Date().toLocaleString() }, ...items].slice(0, 5));
      setNotice({ type: "success", text: kind === "GM" ? "Good Morning! Приветствие записано в блокчейн." : "Good Night! Приветствие записано в блокчейн.", hash: tx.hash });
      const [gm, gn] = await Promise.all([contract.totalGM(), contract.totalGN()]);
      setCounts({ gm: gm.toString(), gn: gn.toString() });
    } catch (error) {
      const message = error?.code === 4001 ? "Транзакция отклонена в MetaMask." : (error?.shortMessage || error?.reason || error?.message || "Ошибка транзакции.");
      setNotice({ type: "error", text: message });
    } finally { setBusy(""); }
  }

  const networkLabel = network?.name || (chainId ? `Неизвестная сеть (${chainId})` : "Сеть не выбрана");

  return <main className={chainId === 4441 ? "app night-mode" : "app"}>
    <header className="topbar">
      <div className="wallet-actions">
        <div className="network-wrap">
          <button className="network-button" onClick={() => setMenuOpen(!menuOpen)}><Network size={16}/><span>{networkLabel}</span><ChevronDown size={15}/></button>
          {menuOpen && <div className="network-menu">
            {Object.values(NETWORKS).map((item) => <button key={item.id} onClick={() => switchNetwork(item.id)}>{item.name}{chainId === item.id ? " ✓" : ""}</button>)}
          </div>}
        </div>
        <button className="connect-button" onClick={connectWallet}><Wallet size={16}/>{account ? shortAddress(account) : "Connect Wallet"}</button>
      </div>
      <div className="brand"><span className="brand-mark">☀</span><span>GM<span className="brand-dash">-</span>GN</span></div>
    </header>

    <section className="hero">
      <div className="eyebrow">A LITTLE GREETING, FOREVER ON-CHAIN</div>
      <h1>Every day starts<br/><span>with a hello.</span></h1>
      <p className="intro">Send good vibes to the blockchain.<br/>One tap. One greeting. Your network.</p>

      <div className="celestial-stage">
        <button className="celestial-card sun-card" onClick={() => sendGreeting("GM")} disabled={Boolean(busy)}>
          <div className="sun-art"><Sun className="sun-icon" strokeWidth={1.2}/><span className="sun-glow"/></div>
          <span className="greeting-label">GM</span><span className="greeting-sub">GOOD MORNING</span>
          {busy === "GM" && <span className="button-loading"><LoaderCircle className="spin" size={18}/> Sending…</span>}
        </button>
        <button className="celestial-card moon-card" onClick={() => sendGreeting("GN")} disabled={Boolean(busy)}>
          <div className="moon-art"><Moon className="moon-icon" strokeWidth={1.2}/><span className="moon-star star-one">✦</span><span className="moon-star star-two">✧</span><span className="moon-star star-three">·</span></div>
          <span className="greeting-label">GN</span><span className="greeting-sub">GOOD NIGHT</span>
          {busy === "GN" && <span className="button-loading"><LoaderCircle className="spin" size={18}/> Sending…</span>}
        </button>
      </div>

      <div className="chain-caption"><span className="live-dot"/>{networkLabel}<span className="caption-divider">·</span>{configured ? "Contract connected" : "Contract setup pending"}</div>
    </section>

    <section className="stats">
      <div className="stat"><span className="stat-icon">☀</span><strong>{counts.gm}</strong><span>GM SENT</span></div>
      <div className="stat-line"/>
      <div className="stat"><span className="stat-icon moon-stat">☾</span><strong>{counts.gn}</strong><span>GN SENT</span></div>
    </section>

    {notice && <div className={`notice ${notice.type}`}>
      {notice.type === "success" ? <CheckCircle2 size={18}/> : notice.type === "error" ? <AlertCircle size={18}/> : <LoaderCircle size={18} className="spin"/>}
      <div><span>{notice.text}</span>{notice.hash && network && <a href={`${network.explorer}/tx/${notice.hash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={13}/></a>}</div>
    </div>}

    {history.length > 0 && <section className="history"><h2>YOUR RECENT GREETINGS</h2>{history.map((item) => <div className="history-row" key={item.hash}><span>{item.kind === "GM" ? "☀️" : "🌙"} {item.kind}</span><span>{item.time}</span><a href={`${network.explorer}/tx/${item.hash}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a></div>)}</section>}

    <footer><span>GM-GN © 2025</span><span>BUILT FOR THE ON-CHAIN COMMUNITY</span></footer>
  </main>;
}
