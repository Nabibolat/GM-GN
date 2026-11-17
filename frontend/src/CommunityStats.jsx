import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { Award, CalendarDays, Flame, Trophy, Users, RefreshCw } from "lucide-react";

const ABI = [
  "function totalGM() view returns (uint256)",
  "function totalGN() view returns (uint256)",
  "event GM(address indexed sender, uint256 timestamp)",
  "event GN(address indexed sender, uint256 timestamp)"
];

const LEVELS = [
  { name: "Newcomer", min: 0 },
  { name: "Regular", min: 50 },
  { name: "Rising Star", min: 150 },
  { name: "OG", min: 300 },
  { name: "Legend", min: 600 },
  { name: "Icon", min: 1000 }
];

const BADGES = [
  { id: "first-gm", title: "First Sunrise", icon: "☀️", description: "Send your first GM", test: p => p.gm > 0 },
  { id: "first-gn", title: "First Moon", icon: "🌙", description: "Send your first GN", test: p => p.gn > 0 },
  { id: "dual", title: "Day & Night", icon: "🌗", description: "Send GM and GN on the same day", test: p => p.dualDays > 0 },
  { id: "ten", title: "Getting Started", icon: "✨", description: "Reach 10 greetings", test: p => p.gm + p.gn >= 10 },
  { id: "streak-7", title: "Seven-Day Sun", icon: "🔥", description: "Reach a 7-day streak", test: p => p.bestStreak >= 7 },
  { id: "streak-30", title: "Monthly Legend", icon: "🏆", description: "Reach a 30-day streak", test: p => p.bestStreak >= 30 },
  { id: "fifty", title: "Community Regular", icon: "💫", description: "Reach 50 greetings", test: p => p.gm + p.gn >= 50 }
];

function utcDay(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
}

function calculateProfile(wallet, rows) {
  const days = new Map();
  let gm = 0;
  let gn = 0;
  for (const event of rows) {
    const day = utcDay(event.timestamp);
    if (!days.has(day)) days.set(day, { gm: false, gn: false });
    const item = days.get(day);
    if (event.kind === "GM") { gm += 1; item.gm = true; }
    else { gn += 1; item.gn = true; }
  }
  const activeDays = [...days.keys()].sort();
  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const day of activeDays) {
    const date = new Date(day + "T00:00:00Z");
    const prior = previous ? new Date(previous + "T00:00:00Z") : null;
    run = prior && (date - prior) === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }
  let currentStreak = 0;
  if (activeDays.length) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const last = activeDays[activeDays.length - 1];
    if (last === today || last === yesterday) {
      currentStreak = 1;
      for (let i = activeDays.length - 1; i > 0; i -= 1) {
        const a = new Date(activeDays[i] + "T00:00:00Z");
        const b = new Date(activeDays[i - 1] + "T00:00:00Z");
        if (a - b === 86400000) currentStreak += 1;
        else break;
      }
    }
  }
  const dualDays = [...days.values()].filter(d => d.gm && d.gn).length;
  const xp = activeDays.length * 10 + dualDays * 5 + Math.floor(bestStreak / 7) * 25;
  const levelIndex = LEVELS.reduce((index, level, i) => xp >= level.min ? i : index, 0);
  const level = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  return {
    wallet, gm, gn, activeDays: activeDays.length, dualDays, currentStreak, bestStreak, xp,
    level: level.name, nextLevel: next?.name || "Max level",
    nextLevelXp: next?.min ?? level.min,
    progress: next ? Math.min(100, ((xp - level.min) / (next.min - level.min)) * 100) : 100
  };
}

async function findDeploymentBlock(provider, address, latest) {
  const key = `gmgn:deployment:${address.toLowerCase()}`;
  const cached = Number(localStorage.getItem(key));
  if (Number.isSafeInteger(cached) && cached >= 0 && cached <= latest) return { block: cached, complete: true };
  const latestCode = await provider.getCode(address, latest);
  if (!latestCode || latestCode === "0x") throw new Error("Contract code was not found on this network.");
  try {
    let low = 0;
    let high = latest;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const code = await provider.getCode(address, mid);
      if (code && code !== "0x") high = mid;
      else low = mid + 1;
    }
    localStorage.setItem(key, String(low));
    return { block: low, complete: true };
  } catch {
    return { block: Math.max(0, latest - 1000000), complete: false };
  }
}

async function readCommunity(provider, address, onProgress) {
  const contract = new Contract(address, ABI, provider);
  const latest = await provider.getBlockNumber();
  const deployment = await findDeploymentBlock(provider, address, latest);
  const fromBlock = deployment.block;
  const rows = [];
  let cursor = fromBlock;
  let step = 500000;
  let scanned = 0;
  const total = Math.max(1, latest - fromBlock + 1);
  while (cursor <= latest) {
    let end = Math.min(latest, cursor + step - 1);
    try {
      const logs = await provider.getLogs({ address, fromBlock: cursor, toBlock: end });
      for (const log of logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (!parsed || (parsed.name !== "GM" && parsed.name !== "GN")) continue;
          rows.push({
            wallet: String(parsed.args.sender).toLowerCase(),
            kind: parsed.name,
            timestamp: parsed.args.timestamp.toString(),
            blockNumber: log.blockNumber,
            txHash: log.transactionHash
          });
        } catch { /* Ignore unrelated logs. */ }
      }
      scanned += end - cursor + 1;
      cursor = end + 1;
      onProgress(Math.min(99, Math.round((scanned / total) * 100)));
    } catch (error) {
      if (step <= 2000) throw error;
      step = Math.max(2000, Math.floor(step / 2));
    }
  }
  const [totalGM, totalGN] = await Promise.all([contract.totalGM(), contract.totalGN()]);
  return { rows, totalGM: totalGM.toString(), totalGN: totalGN.toString(), fromBlock, latest, partialHistory: !deployment.complete };
}

export default function CommunityStats({ network, account }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("progress");
  const [updatedAt, setUpdatedAt] = useState(null);

  const contractAddress = network?.contract;
  const valid = Boolean(contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress) && network?.rpc);

  async function refresh() {
    if (!valid) return;
    setLoading(true);
    setError("");
    setProgress(0);
    try {
      const provider = new JsonRpcProvider(network.rpc, network.id);
      const result = await readCommunity(provider, contractAddress, setProgress);
      setData(result);
      setUpdatedAt(new Date());
      provider.destroy();
    } catch (e) {
      setError(e?.shortMessage || e?.message || "Could not load on-chain activity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setData(null);
    refresh();
    // The selected network/contract determines the public event history.
  }, [network?.id, contractAddress]);

  const profiles = useMemo(() => {
    if (!data) return [];
    const grouped = new Map();
    for (const event of data.rows) {
      if (!grouped.has(event.wallet)) grouped.set(event.wallet, []);
      grouped.get(event.wallet).push(event);
    }
    return [...grouped.entries()].map(([wallet, events]) => calculateProfile(wallet, events))
      .sort((a, b) => b.xp - a.xp || (b.gm + b.gn) - (a.gm + a.gn));
  }, [data]);

  const me = account ? profiles.find(p => p.wallet === account.toLowerCase()) : null;
  const badges = me ? BADGES.map(b => ({ ...b, earned: b.test(me) })) : [];
  const levelProgress = me ? me.progress : 0;

  if (!valid) return <section className="community-panel"><h2>COMMUNITY HUB</h2><p>Community stats will appear when a contract is configured for this network.</p></section>;

  return <section className="community-panel">
    <div className="community-heading">
      <div><span className="section-kicker">THE COMMUNITY IS GROWING</span><h2>Community hub</h2></div>
      <button className="refresh-button" onClick={refresh} disabled={loading} aria-label="Refresh community stats"><RefreshCw size={15} className={loading ? "spin" : ""}/></button>
    </div>
    <div className="community-totals">
      <div><strong>{data?.totalGM ?? "—"}</strong><span>ALL-TIME GM</span></div>
      <div><strong>{data?.totalGN ?? "—"}</strong><span>ALL-TIME GN</span></div>
      <div><strong>{data ? profiles.length : "—"}</strong><span>PARTICIPANTS</span></div>
    </div>
    {loading && <div className="scan-status"><span>Reading public on-chain events… {progress}%</span><div><i style={{ width: progress + "%" }}/></div></div>}
    {error && <div className="scan-error">{error}<button onClick={refresh}>Try again</button></div>}
    {data && <div className="community-tabs">
      <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}><Flame size={14}/> My progress</button>
      <button className={tab === "leaderboard" ? "active" : ""} onClick={() => setTab("leaderboard")}><Trophy size={14}/> Leaderboard</button>
      <button className={tab === "badges" ? "active" : ""} onClick={() => setTab("badges")}><Award size={14}/> Badges</button>
    </div>}
    {data && tab === "progress" && <div className="progress-content">
      {!account ? <div className="empty-state"><Users size={24}/><strong>Connect your wallet</strong><span>Your on-chain progress will be calculated from your GM/GN activity.</span></div> :
        !me ? <div className="empty-state"><CalendarDays size={24}/><strong>Your journey starts here</strong><span>Send your first GM or GN on {network.name} to start earning XP.</span></div> :
        <>
          <div className="progress-top"><div><span className="muted-label">YOUR LEVEL</span><strong>{me.level}</strong></div><div className="xp-value">{me.xp} XP</div></div>
          <div className="level-track"><i style={{ width: levelProgress + "%" }}/></div>
          <div className="level-caption"><span>{me.xp} XP</span><span>{me.nextLevelXp} XP · {me.nextLevel}</span></div>
          <div className="personal-metrics">
            <div><strong><Flame size={16}/>{me.currentStreak}</strong><span>DAY STREAK</span></div>
            <div><strong>{me.activeDays}</strong><span>ACTIVE DAYS</span></div>
            <div><strong>{me.gm + me.gn}</strong><span>GREETINGS</span></div>
          </div>
          <p className="xp-note">Earn 10 XP per active day, +5 XP for sending both GM and GN on the same UTC day, and +25 XP for every 7-day best-streak milestone.</p>
        </>}
    </div>}
    {data && tab === "leaderboard" && <div className="leaderboard">
      {profiles.length === 0 ? <div className="empty-state">No greetings yet. Be the first!</div> : profiles.slice(0, 10).map((p, i) =>
        <div className={"leader-row " + (account && p.wallet === account.toLowerCase() ? "is-me" : "")} key={p.wallet}>
          <span className="leader-rank">{i + 1}</span><span className="leader-wallet">{p.wallet.slice(0, 6)}…{p.wallet.slice(-4)}{account && p.wallet === account.toLowerCase() ? " (you)" : ""}</span><span className="leader-level">{p.level}</span><strong>{p.xp} XP</strong>
        </div>)}
    </div>}
    {data && tab === "badges" && <div className="badge-grid">
      {!me ? <div className="empty-state">Connect your wallet to view your achievements.</div> : badges.map(b =>
        <div className={"badge-tile " + (b.earned ? "earned" : "locked")} key={b.id}><span>{b.icon}</span><strong>{b.title}</strong><small>{b.description}</small><em>{b.earned ? "UNLOCKED" : "LOCKED"}</em></div>)}
    </div>}
    <div className="community-footnote">
      <span>{data.partialHistory ? "Recent event window only: this RPC does not expose full historical state. " : "Full contract event history scanned. "}XP and rankings are calculated from public events on {network.name}. Dates use UTC.</span>
      {updatedAt && <span>Updated {updatedAt.toLocaleTimeString()}</span>}
    </div>
  </section>;
}
