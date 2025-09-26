import { ensureAuthenticated } from "./userData";

const API = "http://localhost:3000/api/crash";
const CORE_API = "http://localhost:3000/api";

type MessageKind = "info" | "success" | "error";

type RoundStatus = "idle" | "running" | "cashed" | "crashed";

type Proof = {
	serverSeed: string;
	clientSeed: string;
	commit: string;
	nonce: number;
	hash: string;
	crashPoint: number;
};

const multiplierEl = document.querySelector<HTMLDivElement>("#multiplier")!;
const statusTextEl = document.querySelector<HTMLDivElement>("#status-text")!;
const messageEl = document.querySelector<HTMLDivElement>("#message")!;
const balanceEl = document.querySelector<HTMLSpanElement>("#balance")!;
const earningsEl = document.querySelector<HTMLSpanElement>("#earnings")!;
const commitEl = document.querySelector<HTMLSpanElement>("#commit")!;
const clientSeedEl = document.querySelector<HTMLSpanElement>("#client-seed")!;
const nonceEl = document.querySelector<HTMLSpanElement>("#nonce")!;
const serverSeedEl = document.querySelector<HTMLSpanElement>("#server-seed")!;
const hashEl = document.querySelector<HTMLSpanElement>("#hash")!;
const crashPointEl = document.querySelector<HTMLSpanElement>("#crash-point")!;
const verificationEl = document.querySelector<HTMLSpanElement>("#verification")!;
const betInput = document.querySelector<HTMLInputElement>("#bet")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start")!;
const cashoutBtn = document.querySelector<HTMLButtonElement>("#cashout")!;
const revealBtn = document.querySelector<HTMLButtonElement>("#reveal")!;
const headerGemEl = document.querySelector<HTMLElement>("#gem-balance");

let clientSeed = Math.random().toString(36).slice(2);
let activeGameId: string | null = null;
let completedGameId: string | null = null;
let pollTimer: number | null = null;
let balance: number | null = null;
let currentBet: number | null = null;
let fairnessProof: Proof | null = null;




const gameContainer = document.querySelector<HTMLDivElement>(".chart-bg")?.parentElement!;

function startAnimation() {
  gameContainer.classList.remove("crashed");
  gameContainer.classList.add("running");
}

function stopAnimation(crashed: boolean) {
  gameContainer.classList.remove("running");
  if (crashed) {
    gameContainer.classList.add("crashed");
  }
}

function cashoutAnimation(cashout: boolean) {
	gameContainer.classList.remove("running");
	if (cashout) {
	  gameContainer.classList.add("cashout");
	}
  }

function setMessage(kind: MessageKind | null, text: string) {
	messageEl.textContent = text;
	messageEl.className = "crash-message";
	if (kind && text) {
		messageEl.classList.add("show", kind);
	}
}

function setMultiplier(value: number) {
	const clamped = Number.isFinite(value) ? value : 1;
	multiplierEl.textContent = `${clamped.toFixed(2)}x`;
}

function setStatusText(text: string) {
	statusTextEl.textContent = text;
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

function setEarnings(value: number | null) {
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

function setCommitData(commit: string | null, seed: string | null, nonce: number | null) {
	commitEl.textContent = commit ?? "--";
	clientSeedEl.textContent = seed ?? "--";
	nonceEl.textContent = nonce === null || nonce === undefined ? "--" : String(nonce);
}

function clearProofFields() {
	fairnessProof = null;
	serverSeedEl.textContent = "--";
	hashEl.textContent = "--";
	crashPointEl.textContent = "--";
	verificationEl.textContent = "--";
	verificationEl.classList.remove("success", "error");
}

function setCrashPoint(value: number | null) {
	if (value === null || !Number.isFinite(value)) {
		crashPointEl.textContent = "--";
		return;
	}
	crashPointEl.textContent = `${value.toFixed(2)}x`;
}

function startPolling() {
	if (pollTimer !== null) return;
	pollTimer = window.setInterval(() => {
		void pollStatus();
	}, 350);
}

function stopPolling() {
	if (pollTimer !== null) {
		window.clearInterval(pollTimer);
		pollTimer = null;
	}
}

async function refreshBalance() {
	try {
		const res = await fetch(`${CORE_API}/balance`);
		if (!res.ok) return;
		const data = await res.json();
		if (typeof data.balance === "number") {
			setBalance(data.balance);
		}
	} catch (_) {}
}

function parseBet(): number | null {
	const raw = Number.parseFloat(betInput.value);
	if (!Number.isFinite(raw)) {
		return null;
	}
	const value = Math.floor(raw);
	return value > 0 ? value : null;
}

function updateControlsForState(state: RoundStatus) {
	if (state === "running") {
		startBtn.disabled = true;
		cashoutBtn.disabled = false;
		revealBtn.disabled = true;
		return;
	}
	startBtn.disabled = false;
	cashoutBtn.disabled = true;
	revealBtn.disabled = state === "idle";
}

function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
	const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
	const buffer = new ArrayBuffer(clean.length / 2);
	const view = new Uint8Array(buffer);
	for (let i = 0; i < view.length; i += 1) {
		const segment = clean.slice(i * 2, i * 2 + 2);
		view[i] = Number.parseInt(segment, 16);
	}
	return buffer;
}

async function computeRoundHash(serverSeed: string, seed: string, nonce: number): Promise<string> {
	if (!window.crypto || !window.crypto.subtle) {
		throw new Error("crypto unavailable");
	}
	const keyData = hexToArrayBuffer(serverSeed);
	const key = await window.crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const message = new TextEncoder().encode(`${seed}:${nonce}`);
	const signature = await window.crypto.subtle.sign("HMAC", key, message);
	return bufferToHex(signature);
}

function computeCrashPoint(hash: string): number {
	const full = BigInt(`0x${hash}`);
	if (full % 33n === 0n) return 1;
	const slice = BigInt(`0x${hash.slice(0, 13)}`);
	const max = 1n << 52n;
	const denom = max - slice;
	if (denom <= 0n) return 1;
	const value = (100n * max) / denom;
	return Number(value) / 100;
}

function setVerification(text: string, success: boolean | null) {
	verificationEl.textContent = text;
	verificationEl.classList.remove("success", "error");
	if (success === true) {
		verificationEl.classList.add("success");
	}
	if (success === false) {
		verificationEl.classList.add("error");
	}
}

async function verifyProof(proof: Proof) {
	try {
		const derivedHash = await computeRoundHash(proof.serverSeed, proof.clientSeed, proof.nonce);
		if (derivedHash !== proof.hash) {
			setVerification("Hash mismatch", false);
			return;
		}
		const derivedCrash = computeCrashPoint(proof.hash);
		const delta = Math.abs(derivedCrash - proof.crashPoint);
		if (delta < 0.01) {
			setVerification("Verified", true);
			return;
		}
		setVerification("Crash mismatch", false);
	} catch (err) {
		setVerification(err instanceof Error ? err.message : "Verification unavailable", null);
	}
}

function applyProof(proof: Proof) {
	fairnessProof = proof;
	serverSeedEl.textContent = proof.serverSeed;
	hashEl.textContent = proof.hash;
	setCrashPoint(proof.crashPoint);
	setVerification("Checking...", null);
	void verifyProof(proof);
}

async function startRound() {
	if (activeGameId) {
		setMessage("error", "Round already running");
		return;
	}
	const bet = parseBet();
	if (bet === null) {
		setMessage("error", "Enter a valid bet amount");
		return;
	}
	if (balance !== null && bet > balance) {
		setMessage("error", "Not enough gems for that bet");
		return;
	}
	setMessage("info", "Starting round...");
	startBtn.disabled = true;
	cashoutBtn.disabled = true;
	revealBtn.disabled = true;
	try {
		const res = await fetch(`${API}/start`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ bet, clientSeed })
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			setMessage("error", String(data.error ?? "Unable to start round"));
			startBtn.disabled = false;
			return;
		}
		activeGameId = data.gameId;
		completedGameId = null;
		currentBet = typeof data.bet === "number" ? data.bet : bet;
		clientSeed = typeof data.clientSeed === "string" && data.clientSeed.length > 0 ? data.clientSeed : clientSeed;
		setCommitData(data.commit ?? null, clientSeed, typeof data.nonce === "number" ? data.nonce : null);
		setMultiplier(1);
		setCrashPoint(null);
		clearProofFields();
		if (typeof data.balance === "number") {
			setBalance(data.balance);
		}
		setEarnings(0);
		setStatusText("Running");
		startAnimation();
		setMessage("info", "Round armed");
		updateControlsForState("running");
		startPolling();
	} catch (err) {
		setMessage("error", err instanceof Error ? err.message : "Unable to start round");
		startBtn.disabled = false;
	}
}

async function pollStatus() {
	if (!activeGameId) return;
	try {
		const res = await fetch(`${API}/status?gameId=${encodeURIComponent(activeGameId)}`);
		if (!res.ok) {
			if (res.status === 404) {
				stopPolling();
				activeGameId = null;
				updateControlsForState("idle");
			}
			return;
		}
		const data = await res.json();
		if (typeof data.multiplier === "number") {
			setMultiplier(data.multiplier);
		}
		if (data.status === "running") {
			setStatusText("Running");
			return;
		}
		stopPolling();
		completedGameId = activeGameId;
		activeGameId = null;
		if (data.status === "crashed") {
			updateControlsForState("crashed");
			setStatusText("Crashed");
			stopAnimation(true);
			if (typeof data.crashPoint === "number") {
				setCrashPoint(data.crashPoint);
			}
			setMessage("error", data.crashPoint ? `Busted at ${data.crashPoint.toFixed(2)}x` : "Round crashed");
			if (currentBet !== null) {
				setEarnings(-currentBet);
			}
			currentBet = null;
			if (typeof data.commit === "string") {
				setCommitData(data.commit, typeof data.clientSeed === "string" ? data.clientSeed : clientSeed, typeof data.nonce === "number" ? data.nonce : null);
			}
			if (!fairnessProof) {
				void requestReveal();
			}
			return;
		}
		if (data.status === "cashed") {
			updateControlsForState("cashed");
			setStatusText("Cashed out");
			cashoutAnimation(false);
			if (typeof data.commit === "string") {
				setCommitData(data.commit, typeof data.clientSeed === "string" ? data.clientSeed : clientSeed, typeof data.nonce === "number" ? data.nonce : null);
			}
		}
	} catch (_) {}
}

async function cashOut() {
	if (!activeGameId) return;
	cashoutBtn.disabled = true;
	try {
		const res = await fetch(`${API}/cashout`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId: activeGameId })
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			setMessage("error", String(data.error ?? "Cashout failed"));
			cashoutBtn.disabled = false;
			return;
		}
		stopPolling();
		completedGameId = activeGameId;
		activeGameId = null;
		updateControlsForState("cashed");
		setStatusText("Cashed out");
		const payout = typeof data.payout === "number" ? data.payout : null;
		if (payout !== null && currentBet !== null) {
			setEarnings(payout - currentBet);
		}
		if (typeof data.balance === "number") {
			setBalance(data.balance);
		}
		if (typeof data.multiplier === "number") {
			setMultiplier(data.multiplier);
			setMessage("success", `Cashed out at ${data.multiplier.toFixed(2)}x`);
		}
		if (typeof data.crashPoint === "number") {
			setCrashPoint(data.crashPoint);
		}
		const proof: Proof | null = typeof data.serverSeed === "string" && typeof data.hash === "string" && typeof data.crashPoint === "number"
			? {
				serverSeed: data.serverSeed,
				clientSeed: typeof data.clientSeed === "string" ? data.clientSeed : clientSeed,
				commit: typeof data.commit === "string" ? data.commit : commitEl.textContent ?? "",
				nonce: typeof data.nonce === "number" ? data.nonce : 0,
				hash: data.hash,
				crashPoint: data.crashPoint
			}
			: null;
		if (proof) {
			setCommitData(proof.commit, proof.clientSeed, proof.nonce);
			applyProof(proof);
		}
		currentBet = null;
	} catch (err) {
		setMessage("error", err instanceof Error ? err.message : "Cashout failed");
		cashoutBtn.disabled = false;
	}
}

async function requestReveal() {
	const targetId = completedGameId;
	if (!targetId) {
		setMessage("info", "No round to reveal");
		return;
	}
	revealBtn.disabled = true;
	try {
		const res = await fetch(`${API}/reveal`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId: targetId })
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			setMessage("error", String(data.error ?? "Reveal failed"));
			revealBtn.disabled = false;
			return;
		}
		const proof: Proof | null = typeof data.serverSeed === "string" && typeof data.hash === "string" && typeof data.crashPoint === "number"
			? {
				serverSeed: data.serverSeed,
				clientSeed: typeof data.clientSeed === "string" ? data.clientSeed : clientSeed,
				commit: typeof data.commit === "string" ? data.commit : commitEl.textContent ?? "",
				nonce: typeof data.nonce === "number" ? data.nonce : 0,
				hash: data.hash,
				crashPoint: data.crashPoint
			}
			: null;
		if (proof) {
			setCommitData(proof.commit, proof.clientSeed, proof.nonce);
			applyProof(proof);
		}
		if (typeof data.payout === "number" && currentBet !== null) {
			setEarnings(data.payout - currentBet);
		}
		if (typeof data.status === "string") {
			updateControlsForState(data.status === "crashed" ? "crashed" : "cashed");
		}
		completedGameId = null;
		setMessage("success", "Fairness proof revealed");
	} catch (err) {
		setMessage("error", err instanceof Error ? err.message : "Reveal failed");
		revealBtn.disabled = false;
	}
}

startBtn.addEventListener("click", () => {
	void startRound();
});

cashoutBtn.addEventListener("click", () => {
	void cashOut();
});

revealBtn.addEventListener("click", () => {
	void requestReveal();
});

void ensureAuthenticated().then((profile) => {
	if (!profile) {
		return;
	}
	void refreshBalance();
});
updateControlsForState("idle");
setMultiplier(1);
setCommitData(null, clientSeed, null);
setCrashPoint(null);
setEarnings(0);
setMessage(null, "");