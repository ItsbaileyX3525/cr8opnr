const express = require("express");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

router.use(requireLogin);

const rounds = new Map();

const MAX_BET = 1000000;
const EXP_DIVISOR = 10000;

function createServerSeed() {
	const serverSeed = crypto.randomBytes(32).toString("hex");
	const commit = crypto
		.createHash("sha256")
		.update(Buffer.from(serverSeed, "hex"))
		.digest("hex");
	return { serverSeed, commit };
}

function deriveHash(serverSeed, clientSeed, nonce) {
	return crypto
		.createHmac("sha256", Buffer.from(serverSeed, "hex"))
		.update(`${clientSeed}:${nonce}`)
		.digest("hex");
}

function computeCrashPoint(hash) {
	const full = BigInt(`0x${hash}`);
	if (full % 33n === 0n) return 1;
	const slice = BigInt(`0x${hash.slice(0, 13)}`);
	const max = 1n << 52n;
	const denom = max - slice;
	if (denom <= 0n) return 1;
	const value = (100n * max) / denom;
	const result = Number(value) / 100;
	return result < 1 ? 1 : result;
}

function getActiveRound(userId) {
	for (const round of rounds.values()) {
		if (round.userId === userId && round.status === "running") {
			return round;
		}
	}
	return null;
}

function parseBet(value) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return NaN;
}

function normalizeClientSeed(seed) {
	if (typeof seed === "string" && seed.trim().length > 0) {
		return seed.trim().slice(0, 128);
	}
	return uuidv4();
}

function formatMultiplier(value) {
	return Math.floor(value * 100) / 100;
}

function resolveLiveMultiplier(round, now) {
	if (round.status === "cashed") return round.cashoutMultiplier;
	if (round.status === "crashed") return round.crashPoint;
	const elapsed = Math.max(0, now - round.startedAt);
	const raw = Math.exp(elapsed / EXP_DIVISOR);
	const capped = raw >= round.crashPoint ? round.crashPoint : raw;
	return formatMultiplier(capped);
}

function updateRoundState(round, now) {
	const current = resolveLiveMultiplier(round, now);
	if (round.status === "running" && current >= round.crashPoint) {
		round.status = "crashed";
		round.endedAt = now;
		round.currentMultiplier = round.crashPoint;
		return round.crashPoint;
	}
	round.currentMultiplier = current;
	return current;
}

router.post("/crash/start", async (req, res) => {
	const payload = req.body || {};
	let bet = parseBet(payload.bet);
	if (!Number.isFinite(bet) || bet <= 0) {
		return res.status(400).json({ error: "Invalid bet amount" });
	}
	bet = Math.floor(bet);
	if (bet > MAX_BET) bet = MAX_BET;
	const userId = req.session.userId;
	if (getActiveRound(userId)) {
		return res.status(400).json({ error: "Finish your current crash round first" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		await conn.beginTransaction();
		const rows = await conn.query("SELECT gems FROM users WHERE id = ? FOR UPDATE", [userId]);
		if (!rows || rows.length === 0) {
			await conn.rollback();
			return res.status(404).json({ error: "User not found" });
		}
		const balance = Number(rows[0].gems);
		if (!Number.isFinite(balance) || balance < bet) {
			await conn.rollback();
			return res.status(400).json({ error: "Insufficient gems" });
		}
		const updatedBalance = balance - bet;
		await conn.query("UPDATE users SET gems = ? WHERE id = ?", [updatedBalance, userId]);
		await conn.commit();
		const { serverSeed, commit } = createServerSeed();
		const clientSeed = normalizeClientSeed(payload.clientSeed);
		const nonce = 0;
		const hash = deriveHash(serverSeed, clientSeed, nonce);
		let crashPoint = computeCrashPoint(hash);
		if (!Number.isFinite(crashPoint) || crashPoint < 1) crashPoint = 1;
		const roundId = uuidv4();
		const startedAt = Date.now();
		const round = {
			id: roundId,
			userId,
			bet,
			commit,
			serverSeed,
			clientSeed,
			nonce,
			hash,
			crashPoint,
			status: "running",
			startedAt,
			currentMultiplier: 1,
			cashoutMultiplier: null,
			payout: null,
			endedAt: null,
			cashedAt: null,
			revealed: false
		};
		rounds.set(roundId, round);
		return res.json({
			gameId: roundId,
			commit,
			clientSeed,
			nonce,
			bet,
			balance: updatedBalance,
			startedAt,
			multiplier: 1
		});
	} catch (err) {
		if (conn) {
			try {
				await conn.rollback();
			} catch (_) {}
		}
		console.error("/crash/start error", err);
		return res.status(500).json({ error: "Internal server error" });
	} finally {
		if (conn) conn.release();
	}
});

router.get("/crash/status", (req, res) => {
	const gameId = req.query.gameId;
	if (typeof gameId !== "string" || gameId.length === 0) {
		return res.status(400).json({ error: "Invalid game id" });
	}
	const round = rounds.get(gameId);
	if (!round) {
		return res.status(404).json({ error: "Game not found" });
	}
	if (round.userId !== req.session.userId) {
		return res.status(403).json({ error: "Forbidden" });
	}
	const now = Date.now();
	const multiplier = updateRoundState(round, now);
	const payload = {
		gameId,
		status: round.status,
		multiplier,
		bet: round.bet,
		startedAt: round.startedAt,
		endedAt: round.endedAt,
		cashoutMultiplier: round.cashoutMultiplier,
		payout: round.payout
	};
	if (round.status === "crashed") {
		payload.crashPoint = round.crashPoint;
	}
	if (round.status !== "running") {
		payload.commit = round.commit;
		payload.clientSeed = round.clientSeed;
		payload.nonce = round.nonce;
	}
	return res.json(payload);
});

router.post("/crash/cashout", async (req, res) => {
	const { gameId } = req.body || {};
	if (typeof gameId !== "string" || gameId.length === 0) {
		return res.status(400).json({ error: "Invalid game id" });
	}
	const round = rounds.get(gameId);
	if (!round) {
		return res.status(404).json({ error: "Game not found" });
	}
	if (round.userId !== req.session.userId) {
		return res.status(403).json({ error: "Forbidden" });
	}
	const now = Date.now();
	const multiplier = updateRoundState(round, now);
	if (round.status === "crashed") {
		return res.status(400).json({ error: "Round already crashed" });
	}
	if (round.status === "cashed") {
		return res.json({
			success: true,
			multiplier: round.cashoutMultiplier,
			payout: round.payout,
			balance: round.balanceAtPayout,
			serverSeed: round.serverSeed,
			clientSeed: round.clientSeed,
			nonce: round.nonce,
			commit: round.commit,
			hash: round.hash,
			crashPoint: round.crashPoint,
			endedAt: round.cashedAt
		});
	}
	const payout = Math.floor(round.bet * Math.max(multiplier, 1));
	let conn;
	try {
		conn = await pool.getConnection();
		await conn.beginTransaction();
		const rows = await conn.query("SELECT gems FROM users WHERE id = ? FOR UPDATE", [round.userId]);
		if (!rows || rows.length === 0) {
			await conn.rollback();
			return res.status(404).json({ error: "User not found" });
		}
		const balance = Number(rows[0].gems);
		const updatedBalance = Number.isFinite(balance) ? balance + payout : payout;
		await conn.query("UPDATE users SET gems = ? WHERE id = ?", [updatedBalance, round.userId]);
		await conn.commit();
		round.status = "cashed";
		round.cashoutMultiplier = multiplier;
		round.payout = payout;
		round.cashedAt = now;
		round.endedAt = now;
		round.balanceAtPayout = updatedBalance;
		round.revealed = true;
		return res.json({
			success: true,
			multiplier,
			payout,
			balance: updatedBalance,
			serverSeed: round.serverSeed,
			clientSeed: round.clientSeed,
			nonce: round.nonce,
			commit: round.commit,
			hash: round.hash,
			crashPoint: round.crashPoint,
			endedAt: now
		});
	} catch (err) {
		if (conn) {
			try {
				await conn.rollback();
			} catch (_) {}
		}
		console.error("/crash/cashout error", err);
		return res.status(500).json({ error: "Internal server error" });
	} finally {
		if (conn) conn.release();
	}
});

router.post("/crash/reveal", (req, res) => {
	const { gameId } = req.body || {};
	if (typeof gameId !== "string" || gameId.length === 0) {
		return res.status(400).json({ error: "Invalid game id" });
	}
	const round = rounds.get(gameId);
	if (!round) {
		return res.status(404).json({ error: "Game not found" });
	}
	if (round.userId !== req.session.userId) {
		return res.status(403).json({ error: "Forbidden" });
	}
	updateRoundState(round, Date.now());
	if (round.status === "running") {
		return res.status(400).json({ error: "Round still in progress" });
	}
	round.revealed = true;
	rounds.delete(gameId);
	return res.json({
		serverSeed: round.serverSeed,
		clientSeed: round.clientSeed,
		commit: round.commit,
		nonce: round.nonce,
		hash: round.hash,
		crashPoint: round.crashPoint,
		bet: round.bet,
		status: round.status,
		payout: round.payout,
		startedAt: round.startedAt,
		endedAt: round.endedAt
	});
});

module.exports = router;