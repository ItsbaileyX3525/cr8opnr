import { ensureAuthenticated } from "./userData";

const API = "http://localhost:3000/api";

type TileState = "hidden" | "safe" | "mine";

let clientSeed = Math.random().toString(36).slice(2);
let gameId: string | null = null;
let nonce: number | null = null;
let width = 5;
let height = 5;
let mines = 5;
let board: TileState[] = [];
let gameOver = false;
let currentBet: number | null = null;
let safeRevealCount = 0;
let balance: number | null = null;

const INACTIVITY_LIMIT = 120_000;
let inactivityTimer: number | null = null;
let inactivityResolving = false;

const commitEl = document.querySelector<HTMLSpanElement>("#commit")!;
const clientSeedEl = document.querySelector<HTMLSpanElement>("#client-seed")!;
const nonceEl = document.querySelector<HTMLSpanElement>("#nonce")!;
const boardEl = document.querySelector<HTMLDivElement>("#board")!;
const serverSeedEl = document.querySelector<HTMLDivElement>("#server-seed")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start")!;
const revealBtn = document.querySelector<HTMLButtonElement>("#reveal")!;
const messageEl = document.querySelector<HTMLDivElement>("#message")!;
const balanceEl = document.querySelector<HTMLSpanElement>("#balance")!;
const potentialEl = document.querySelector<HTMLSpanElement>("#potential")!;
const earningsEl = document.querySelector<HTMLSpanElement>("#earnings")!;
const betInput = document.querySelector<HTMLInputElement>("#bet")!;
const cashoutBtn = document.querySelector<HTMLButtonElement>("#cashout")!;
const headerGemEl = document.querySelector<HTMLElement>("#gem-balance");
const gridButtons = document.querySelectorAll<HTMLButtonElement>(".grid-btn");

const minesConfig: Record<number, number> = {
  3: 2,
  4: 4,
  5: 6,
  6: 8,
  7: 10,
  8: 12,
};

gridButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (gameId && !gameOver) {
      showError("Cannot change grid size during an active game.");
      return;
    }
    gridButtons.forEach(b => b.classList.remove("bg-purple-600"));
    btn.classList.add("bg-purple-600");
    const size = parseInt(btn.dataset.size || "5");
    const bombs = minesConfig[size] ?? 4;
    width = size;
    height = size;
    mines = bombs;
    resetBoard(width * height);
    renderBoard();
    updatePotentialDisplay(0);
  });
});

type MessageKind = "info" | "success" | "error";
function setMessage(kind: MessageKind | null, text: string) {
  messageEl.textContent = text;
  messageEl.className = "mines-message";
  if (kind && text) messageEl.classList.add("show", kind);
}
function showInfo(text: string) { setMessage("info", text); }
function showSuccess(text: string) { setMessage("success", text); }
function showError(text: string) { setMessage("error", text); }
function clearMessage() { setMessage(null, ""); }

function setBalance(value: number | null) {
  balance = value;
  balanceEl.textContent = value === null ? "--" : String(value);
  if (headerGemEl) headerGemEl.textContent = value === null ? "--" : String(value);
}

function setEarningsDisplay(value: number | null) {
  earningsEl.classList.remove("positive", "negative");
  if (value === null) { earningsEl.textContent = "--"; return; }
  if (value > 0) { earningsEl.classList.add("positive"); earningsEl.textContent = `+${value}`; return; }
  if (value < 0) { earningsEl.classList.add("negative"); }
  earningsEl.textContent = String(value);
}

function updatePotentialDisplay(value: number) {
  potentialEl.textContent = value > 0 ? String(value) : "0";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tileSizeForDimensions(): number {
  const dominant = Math.max(width, height);
  const target = 370;
  const derived = Math.floor(target / dominant);
  return clamp(derived, 32, 56);
}

function applyTileSize() {
  const size = tileSizeForDimensions();
  boardEl.style.setProperty("--tile-size", `${size}px`);
}

function resetBoard(size: number) {
  board = Array(size).fill("hidden");
  boardEl.innerHTML = "";
}

function applyMineReveal(indices: number[]) {
  for (const index of indices) if (index >= 0 && index < board.length) board[index] = "mine";
}

function calculateLocalPotential(bet: number, reveals: number): number {
  const totalTiles = width * height;
  const safeTiles = totalTiles - mines;
  if (safeTiles <= 0) return bet;
  const clamped = Math.min(Math.max(reveals, 0), safeTiles);
  if (clamped === 0) return bet;
  let multiplier = 1;
  for (let i = 0; i < clamped; i++) multiplier *= (totalTiles - i) / (safeTiles - i);
  const progress = safeTiles === 0 ? 0 : clamped / safeTiles;
  const scale = 0.26 + 0.49 * Math.pow(progress, 1.6);
  return Math.floor(bet * (1 + (multiplier - 1) * scale));
}

function computePotential(): number {
  if (currentBet === null) return 0;
  return calculateLocalPotential(currentBet, safeRevealCount);
}

async function refreshBalance() {
  try {
    const res = await fetch(`${API}/balance`);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) setBalance(null);
      return;
    }
    const data = await res.json();
    if (typeof data.balance === "number") setBalance(data.balance);
  } catch {}
}

function updateNonceDisplay(value: number) {
  nonce = value;
  nonceEl.textContent = String(value);
}

function armInactivityCountdown() {
  if (inactivityTimer !== null) clearTimeout(inactivityTimer);
  if (!gameId || gameOver) return;
  inactivityTimer = window.setTimeout(() => void handleInactivityTimeout(), INACTIVITY_LIMIT);
}

async function handleInactivityTimeout() {
  if (!gameId || gameOver || inactivityResolving) return;
  inactivityResolving = true;
  try {
    await cashOut(); // Auto-cashout on inactivity
  } finally {
    inactivityResolving = false;
  }
}

async function startGame() {
  if (gameId && !gameOver) { showError("Finish your current game first."); return; }
  const betAmount = Math.floor(Number(betInput.value));
  if (!Number.isFinite(betAmount) || betAmount <= 0) { showError("Enter a valid bet amount."); return; }
  if (balance === null || betAmount > balance) { showError("Not enough gems."); return; }

  clearMessage();
  startBtn.disabled = true;
  cashoutBtn.disabled = true;

  try {
    const res = await fetch(`${API}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSeed, width, height, mines, bet: betAmount }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { showError(String(data.error ?? "Unable to start.")); startBtn.disabled = false; return; }

    gameId = data.gameId;
    clientSeed = data.clientSeed ?? clientSeed;
    currentBet = data.bet ?? betAmount;
    safeRevealCount = 0;
    gameOver = false;
    revealBtn.disabled = true;
    cashoutBtn.disabled = false;
    betInput.disabled = true;

    serverSeedEl.textContent = "";
    commitEl.textContent = data.commit;
    clientSeedEl.textContent = clientSeed;
    resetBoard(width * height);
    updateNonceDisplay(data.nonce);
    setBalance(typeof data.balance === "number" ? data.balance : balance);
    updatePotentialDisplay(typeof data.potential === "number" ? data.potential : currentBet ?? betAmount);
    setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : 0);

    showInfo("Game armed. Choose wisely.");
    renderBoard();
    armInactivityCountdown();
  } catch { showError("Unable to start game."); startBtn.disabled = false; }
}

async function clickTile(index: number) {
  if (!gameId || nonce === null || gameOver || board[index] !== "hidden") return;
  clearTimeout(inactivityTimer!);

  try {
    const res = await fetch(`${API}/revealTile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, tile: index }),
    });
    const data = await res.json();

    if (data.error) { showError(String(data.error)); return; }
    if (typeof data.nonce === "number") updateNonceDisplay(data.nonce);

    if (data.result === "mine") {
      board[index] = "mine";
      if (Array.isArray(data.mines)) applyMineReveal(data.mines);
      gameOver = true;
      revealBtn.disabled = false;
      cashoutBtn.disabled = true;
      betInput.disabled = false;
      startBtn.disabled = false;
      updatePotentialDisplay(0);
      safeRevealCount = 0;
      setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : -(currentBet ?? 0));
      currentBet = null;
      showError("Boom! You lost.");
    } else {
      board[index] = "safe";
      safeRevealCount = typeof data.safeReveals === "number" ? data.safeReveals : safeRevealCount + 1;
      updatePotentialDisplay(typeof data.potential === "number" ? data.potential : computePotential());
      setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : (currentBet ? computePotential() - currentBet : 0));
      armInactivityCountdown();
      showSuccess(`Safe tile! ${safeRevealCount} revealed.`);
    }

    renderBoard();
  } catch { showError("Could not reveal tile."); if (!gameOver && gameId) armInactivityCountdown(); }
}

async function cashOut() {
  if (!gameId || gameOver || currentBet === null) return;
  cashoutBtn.disabled = true;

  try {
    const res = await fetch(`${API}/cashout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(String(data.error ?? "Cashout failed."));
      cashoutBtn.disabled = false;
      return;
    }

    gameOver = true;
    safeRevealCount = 0;
    currentBet = null;
    gameId = null;

    setBalance(typeof data.balance === "number" ? data.balance : balance);
    updatePotentialDisplay(0);
    setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : 0);
    revealBtn.disabled = true;
    cashoutBtn.disabled = true;
    betInput.disabled = false;
    startBtn.disabled = false;

    if (Array.isArray(data.mines)) applyMineReveal(data.mines);
    renderBoard();

    showSuccess("Cashed out successfully!");
  } catch {
    showError("Cashout failed.");
    cashoutBtn.disabled = false;
  }
}

async function revealSeed() {
  if (!gameId) return;
  try {
    const res = await fetch(`${API}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { showError(String(data.error ?? "Reveal failed.")); return; }
    serverSeedEl.textContent = data.serverSeed ?? "";
    showInfo("Seed revealed!");
  } catch { showError("Reveal failed."); }
}

function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--columns", String(width));
  boardEl.style.setProperty("--rows", String(height));
  applyTileSize();

  board.forEach((tile, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("tile");
    if (tile === "hidden") btn.classList.add("is-hidden");
    else if (tile === "safe") { btn.classList.add("is-safe"); btn.textContent = "✔"; }
    else if (tile === "mine") { btn.classList.add("is-mine"); btn.textContent = "💣"; }
    btn.disabled = tile !== "hidden" || gameOver;
    btn.onclick = () => clickTile(i);
    boardEl.appendChild(btn);
  });
}

startBtn.onclick = startGame;
revealBtn.onclick = revealSeed;
cashoutBtn.onclick = cashOut;

void ensureAuthenticated().then(profile => { if (profile) refreshBalance(); });
updatePotentialDisplay(0);
setEarningsDisplay(0);
resetBoard(width * height);
renderBoard();