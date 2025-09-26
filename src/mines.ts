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
const gridSizeSelect = document.querySelector<HTMLSelectElement>("#grid-size")!;

type MessageKind = "info" | "success" | "error";


function setGridSize() {
	const value = gridSizeSelect.value;
	if (value === "3x3") { 
		width = height = 3; 
		mines = 2; 
	} else if (value === "4x4") { 
		width = height = 4; 
		mines = 4; 
	} else { 
		width = height = 5; 
		mines = 5; 
	}
}



function setMessage(kind: MessageKind | null, text: string) {
	messageEl.textContent = text;
	messageEl.className = "mines-message";
	if (kind && text) {
		messageEl.classList.add("show", kind);
	}
}

function showInfo(text: string) {
	setMessage("info", text);
}

function showSuccess(text: string) {
	setMessage("success", text);
}

function showError(text: string) {
	setMessage("error", text);
}

function clearMessage() {
	setMessage(null, "");
}

function setBalance(value: number | null) {
	balance = value;
	if (value === null) {
		balanceEl.textContent = "--";
	} else {
		balanceEl.textContent = String(value);
	}
	if (headerGemEl) {
		headerGemEl.textContent = value === null ? "--" : String(value);
	}
}

function setEarningsDisplay(value: number | null) {
	earningsEl.classList.remove("positive", "negative");
	if (value === null) {
		earningsEl.textContent = "--";
		return;
	}
	if (value > 0) {
		earningsEl.classList.add("positive");
		earningsEl.textContent = `+${value}`;
		return;
	}
	if (value < 0) {
		earningsEl.classList.add("negative");
	}
	earningsEl.textContent = String(value);
}

function updatePotentialDisplay(value: number) {
	potentialEl.textContent = value > 0 ? String(value) : "0";
}

function calculateLocalPotential(bet: number, reveals: number): number {
	const totalTiles = width * height;
	const safeTiles = totalTiles - mines;
	if (safeTiles <= 0) return bet;
	const clamped = Math.min(Math.max(reveals, 0), safeTiles);
	if (clamped === 0) return bet;

	let multiplier = 1;
	for (let i = 0; i < clamped; i++) {
		multiplier *= (totalTiles - i) / (safeTiles - i);
	}

	const rewardScale = 1 + (width - 3) * 0.2; // bigger grid, higher reward
	return Math.floor(bet * multiplier * rewardScale);
}

gridSizeSelect.addEventListener("change", () => setGridSize());

function computePotential(): number {
	if (currentBet === null) return 0;
	return calculateLocalPotential(currentBet, safeRevealCount);
}

async function refreshBalance() {
	try {
		const res = await fetch(`${API}/balance`);
		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				setBalance(null);
			}
			return;
		}
		const data = await res.json();
		if (typeof data.balance === "number") {
			setBalance(data.balance);
		}
	} catch (err) {
		// ignore refresh errors to keep existing display
	}
}

function updateNonceDisplay(value: number) {
	nonce = value;
	nonceEl.textContent = String(value);
}

function resetBoard(size: number) {
	board = Array(size).fill("hidden");
	boardEl.innerHTML = "";
	
}

function applyMineReveal(indices: number[]) {
	for (const index of indices) {
		if (index >= 0 && index < board.length) {
			board[index] = "mine";
		}
	}
}

async function startGame() {
	if (gameId && !gameOver) {
		showError("Finish your current game first.");
		return;
	}
	const betAmount = Math.floor(Number(betInput.value));
	if (!Number.isFinite(betAmount) || betAmount <= 0) {
		showError("Enter a valid bet amount.");
		return;
	}
	if (balance === null) {
		showError("Balance unavailable. Refresh and try again.");
		return;
	}
	if (betAmount > balance) {
		showError("Not enough gems for that bet.");
		return;
	}
	clearMessage();
	startBtn.disabled = true;
	cashoutBtn.disabled = true;
	try {
		const res = await fetch(`${API}/start`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ clientSeed, width, height, mines, bet: betAmount })
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			showError(String(data.error ?? "Unable to start a new round."));
			startBtn.disabled = false;
			return;
		}
		gameId = data.gameId;
		clientSeed = data.clientSeed ?? clientSeed;
		width = data.width;
		height = data.height;
		mines = data.mines;
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
	} catch (err) {
		showError("Unable to start a new round.");
		startBtn.disabled = false;
	} finally {
		if (!gameId || gameOver) {
			betInput.disabled = false;
		}
	}
}

async function clickTile(index: number) {
	if (gameId === null || nonce === null || gameOver) return;
	if (board[index] !== "hidden") return;
	try {
		const res = await fetch(`${API}/revealTile`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId, tile: index })
		});
		const data = await res.json();
		if (data.error) {
			showError(String(data.error));
			return;
		}
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
			const lostAmount = currentBet ?? 0;
			safeRevealCount = 0;
			currentBet = null;
			setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : -lostAmount);
			showError(`Boom! You lost ${lostAmount} gems.`);
		} else {
			board[index] = "safe";
			safeRevealCount = typeof data.safeReveals === "number" ? data.safeReveals : safeRevealCount + 1;
			const potential = typeof data.potential === "number" ? data.potential : computePotential();
			updatePotentialDisplay(potential);
			setEarningsDisplay(typeof data.earnings === "number" ? data.earnings : (currentBet ? potential - currentBet : 0));
			showSuccess(`Safe tile! ${safeRevealCount} revealed.`);
		}
		renderBoard();
	} catch (err) {
		showError("Could not reveal the tile.");
	}
}

async function cashOut() {
	if (gameId === null || gameOver) return;
	try {
		const res = await fetch(`${API}/cashout`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId })
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			showError(String(data.error ?? "Cashout failed."));
			return;
		}
		if (data.success === false) {
			showError("Cashout failed.");
			return;
		}
		if (typeof data.balance === "number") setBalance(data.balance);
		if (typeof data.serverSeed === "string") serverSeedEl.textContent = data.serverSeed;
		if (typeof data.earnings === "number") setEarningsDisplay(data.earnings);
		gameOver = true;
		gameId = null;
		cashoutBtn.disabled = true;
		revealBtn.disabled = true;
		betInput.disabled = false;
		startBtn.disabled = false;
		safeRevealCount = 0;
		const betValue = currentBet ?? 0;
		const payout = typeof data.payout === "number" ? data.payout : betValue;
		currentBet = null;
		updatePotentialDisplay(0);
		if (typeof data.earnings !== "number") {
			setEarningsDisplay(payout - betValue);
		}
		showSuccess(`Cashed out ${payout} gems!`);
		renderBoard();
	} catch (err) {
		showError("Cashout failed. Try again.");
	}
}

async function revealSeed() {
	if (gameId === null || !gameOver) return;
	try {
		const res = await fetch(`${API}/reveal`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId })
		});
		const data = await res.json();
		if (data.error) {
			showError(String(data.error));
			return;
		}
		if (Array.isArray(data.mines)) {
			applyMineReveal(data.mines);
			renderBoard();
		}
		if (typeof data.serverSeed === "string") {
			serverSeedEl.textContent = data.serverSeed;
		}
		showSuccess("Server seed revealed.");
		gameId = null;
		startBtn.disabled = false;
		revealBtn.disabled = true;
		cashoutBtn.disabled = true;
		betInput.disabled = false;
		safeRevealCount = 0;
		currentBet = null;
		updatePotentialDisplay(0);
		setEarningsDisplay(0);
	} catch (err) {
		showError("Reveal failed. Try again.");
	}
}

function renderBoard() {
	boardEl.innerHTML = "";
	boardEl.style.setProperty("--columns", String(width));
	boardEl.style.setProperty("--rows", String(height));
	board.forEach((tile, i) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.classList.add("tile");
		if (tile === "hidden") {
			btn.classList.add("is-hidden");
		} else if (tile === "safe") {
			btn.classList.add("is-safe");
			btn.textContent = "✔";
		} else if (tile === "mine") {
			btn.classList.add("is-mine");
			btn.textContent = "💣";
		}
		btn.disabled = tile !== "hidden" || gameOver;
		btn.onclick = () => clickTile(i);
		boardEl.appendChild(btn);
	});
}

startBtn.onclick = startGame;
revealBtn.onclick = revealSeed;
	cashoutBtn.onclick = cashOut;

	void ensureAuthenticated().then((profile) => {
		if (!profile) {
			return;
		}
		void refreshBalance();
	});
	updatePotentialDisplay(0);
	setEarningsDisplay(0);
