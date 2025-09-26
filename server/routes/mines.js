const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require("uuid");
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

function createServerSeed() {
	const serverSeed = crypto.randomBytes(32).toString("hex");
	const commit = crypto.createHash("sha256")
		.update(Buffer.from(serverSeed, "hex"))
		.digest("hex");
	return { serverSeed, commit };
}

function hmacStream(serverSeed, clientSeed, nonce, counter) {
	const key = Buffer.from(serverSeed, "hex");
	const message = `${clientSeed}:${nonce}:${counter}`;
	return crypto.createHmac("sha256", key).update(message).digest();
}

function uniformInt(max, stream) {
	if (max < 0) throw new Error("Max must be bigger than 0");
	const range = max + 1;
	const bytesNeeded = Math.ceil(Math.log2(range) / 8);
	const limit = 2 ** (bytesNeeded * 8);
	while (true) {
		const buf = Buffer.alloc(bytesNeeded);
		for (let i = 0; i < bytesNeeded; i++) {
			buf[i] = stream();
		}
		let val = 0;
		for (let i = 0; i < buf.length; i++) {
			val = (val << 8) + buf[i];
		}
		if (val < Math.floor(limit / range) * range) {
			return val % range;
		}
	}
}

function generateMines(serverSeed, clientSeed, nonce, width, height, minesCount) {
	const N = width * height;
	if (minesCount > N) throw new Error("Too many mines!");
	let counter = 0;
	let buffer = Buffer.alloc(0);
	const streamByte = () => {
		if (buffer.length === 0) {
			buffer = hmacStream(serverSeed, clientSeed, nonce, counter++);
		}
		const byte = buffer[0];
		buffer = buffer.subarray(1);
		return byte;
	};
	const indices = Array.from({ length: N }, (_, i) => i);
	for (let i = N - 1; i >= N - minesCount; i--) {
		const j = uniformInt(i, streamByte);
		[indices[i], indices[j]] = [indices[j], indices[i]];
	}
	return indices.slice(N - minesCount);
}

const games = new Map();

function calculatePayout(game, safeReveals) {
	const { bet, width, height, mines } = game;
	if (!Number.isFinite(bet) || bet <= 0) return 0;
	const totalTiles = width * height;
	const safeTiles = totalTiles - mines;
	if (safeTiles <= 0) return bet;
	const clampedReveals = Math.min(Math.max(safeReveals, 0), safeTiles);
	if (clampedReveals === 0) return bet;
	let fairMultiplier = 1;
	for (let i = 0; i < clampedReveals; i += 1) {
		fairMultiplier *= (totalTiles - i) / (safeTiles - i);
	}
	const progress = safeTiles === 0 ? 0 : clampedReveals / safeTiles;
	const scale = 0.26 + 0.49 * Math.pow(progress, 1.6);
	const multiplier = 1 + (fairMultiplier - 1) * scale;
	const payout = Math.floor(bet * multiplier);
	return payout <= bet ? bet : payout;
}

function findActiveGameForUser(userId) {
	for (const game of games.values()) {
		if (game.userId === userId && game.alive) {
			return game;
		}
	}
	return null;
}

function parseNumber(value, fallback) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function clamp(value, min, max) {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

function normalizeGameConfig(payload) {
	const width = clamp(parseNumber(payload.width, 5), 2, 12);
	const height = clamp(parseNumber(payload.height, 5), 2, 12);
	const maxMines = width * height - 1;
	const mines = clamp(parseNumber(payload.mines, Math.max(1, Math.floor((width * height) / 5))), 1, maxMines);
	const clientSeed = typeof payload.clientSeed === "string" && payload.clientSeed.trim().length > 0 ? payload.clientSeed : uuidv4();
	return { width, height, mines, clientSeed };
}

router.post("/start", async (req, res) => {
	const payload = req.body || {};
	const { width, height, mines, clientSeed } = normalizeGameConfig(payload);
	let betValue = parseNumber(payload.bet, -1);
	if (!Number.isFinite(betValue) || betValue <= 0) {
		return res.status(400).json({ error: "Invalid bet amount" });
	}
	betValue = Math.floor(betValue);
	const betAmount = betValue > 1000000 ? 1000000 : betValue;
	const userId = req.session.userId;
	if (findActiveGameForUser(userId)) {
		return res.status(400).json({ error: "Finish your current game before starting a new one" });
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
		const currentBalance = Number(rows[0].gems);
		if (!Number.isFinite(currentBalance) || currentBalance < betAmount) {
			await conn.rollback();
			return res.status(400).json({ error: "Insufficient gems" });
		}
		const updatedBalance = currentBalance - betAmount;
		await conn.query("UPDATE users SET gems = ? WHERE id = ?", [updatedBalance, userId]);
		await conn.commit();
		const { serverSeed, commit } = createServerSeed();
		const minePositions = new Set(generateMines(serverSeed, clientSeed, 0, width, height, mines));
		const game = {
			id: uuidv4(),
			userId,
			serverSeed,
			commit,
			clientSeed,
			width,
			height,
			mines,
			nonce: 0,
			alive: true,
			bet: betAmount,
			revealed: new Set(),
			minePositions
		};
		games.set(game.id, game);
		const potential = calculatePayout(game, 0);
		res.json({
			gameId: game.id,
			commit,
			nonce: game.nonce,
			width,
			height,
			mines,
			clientSeed,
			bet: betAmount,
			balance: updatedBalance,
			potential,
			earnings: potential - betAmount
		});
	} catch (err) {
		if (conn) {
			try { await conn.rollback(); } catch (_) {}
		}
		console.error("/start error", err);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		if (conn) conn.release();
	}
});

module.exports = router;

router.post("/revealTile", (req, res) => {
	const { gameId, tile } = req.body || {};
	const userId = req.session.userId;
	const game = games.get(gameId);
	if (!game) return res.status(404).json({ error: "Game not found" });
	if (game.userId !== userId) return res.status(403).json({ error: "Forbidden" });
	if (!game.alive) return res.status(400).json({ error: "Game already finished" });
	const index = parseNumber(tile, NaN);
	const limit = game.width * game.height;
	if (!Number.isInteger(index) || index < 0 || index >= limit) return res.status(400).json({ error: "Invalid tile" });
	if (game.revealed.has(index)) {
		const safeReveals = game.revealed.size;
		const potential = calculatePayout(game, safeReveals);
		return res.json({
			result: "safe",
			nonce: game.nonce,
			safeReveals,
			potential,
			earnings: potential - game.bet
		});
	}
	const isMine = game.minePositions.has(index);
	game.nonce += 1;
	if (isMine) {
		game.alive = false;
		game.defeated = true;
		return res.json({
			result: "mine",
			nonce: game.nonce,
			mines: Array.from(game.minePositions),
			bet: game.bet,
			earnings: -game.bet
		});
	}
	game.revealed.add(index);
	const safeReveals = game.revealed.size;
	const potential = calculatePayout(game, safeReveals);
	res.json({
		result: "safe",
		nonce: game.nonce,
		safeReveals,
		potential,
		earnings: potential - game.bet
	});
});

router.post("/cashout", async (req, res) => {
	const { gameId } = req.body || {};
	const userId = req.session.userId;
	const game = games.get(gameId);
	if (!game) return res.status(404).json({ error: "Game not found" });
	if (game.userId !== userId) return res.status(403).json({ error: "Forbidden" });
	if (!game.alive) return res.status(400).json({ error: "Game already finished" });
	const safeReveals = game.revealed.size;
	const payout = calculatePayout(game, safeReveals);
	let conn;
	try {
		conn = await pool.getConnection();
		await conn.beginTransaction();
		const rows = await conn.query("SELECT gems FROM users WHERE id = ? FOR UPDATE", [userId]);
		if (!rows || rows.length === 0) {
			await conn.rollback();
			return res.status(404).json({ error: "User not found" });
		}
		const currentBalance = Number(rows[0].gems);
		const updatedBalance = Number.isFinite(currentBalance) ? currentBalance + payout : payout;
		await conn.query("UPDATE users SET gems = ? WHERE id = ?", [updatedBalance, userId]);
		await conn.commit();
		games.delete(gameId);
		res.json({
			success: true,
			payout,
			balance: updatedBalance,
			safeReveals,
			bet: game.bet,
			earnings: payout - game.bet,
			serverSeed: game.serverSeed,
			commit: game.commit,
			clientSeed: game.clientSeed
		});
	} catch (err) {
		if (conn) {
			try {
				await conn.rollback();
			} catch (_) {}
		}
		console.error("/cashout error", err);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		if (conn) conn.release();
	}
});

router.get("/balance", async (req, res) => {
	const userId = req.session.userId;
	let conn;
	try {
		conn = await pool.getConnection();
		const rows = await conn.query("SELECT gems FROM users WHERE id = ?", [userId]);
		if (!rows || rows.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}
		const balance = Number(rows[0].gems) || 0;
		res.json({ balance });
	} catch (err) {
		console.error("/balance error", err);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		if (conn) conn.release();
	}
});

router.post("/reveal", (req, res) => {
	const { gameId } = req.body || {};
	const userId = req.session.userId;
	const game = games.get(gameId);
	if (!game) return res.status(404).json({ error: "Game not found" });
	if (game.userId !== userId) return res.status(403).json({ error: "Forbidden" });
	if (game.alive) return res.status(400).json({ error: "You can only reveal after game over" });
	games.delete(gameId);
	res.json({
		serverSeed: game.serverSeed,
		mines: Array.from(game.minePositions),
		commit: game.commit,
		clientSeed: game.clientSeed
	});
});

module.exports = router;