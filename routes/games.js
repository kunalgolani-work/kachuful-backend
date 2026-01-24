const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all games for user
router.get('/', auth, async (req, res) => {
  try {
    const { gameId } = req.query;
    let query = { userId: req.user._id };
    
    if (gameId) {
      query.gameId = gameId;
    }
    
    const games = await Game.find(query)
      .sort({ date: -1 })
      .limit(50);
    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active game
router.get('/active', auth, async (req, res) => {
  try {
    const game = await Game.findOne({ 
      userId: req.user._id,
      'gameState.phase': { $in: ['BID', 'RESULT'] }
    }).sort({ createdAt: -1 });
    
    res.json(game);
  } catch (error) {
    console.error('Get active game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate Mayhem rounds for a new game
const generateMayhemRounds = (numPlayers) => {
  const mayhemRounds = [];
  const minRound = 2;
  const maxRound = 30;
  const minGap = 4; // Minimum rounds between any two mayhem rounds

  // 3-5 mayhem rounds, 2x only
  const numMayhemRounds = 3 + Math.floor(Math.random() * 3);

  const pool = [];
  for (let r = minRound; r <= maxRound; r++) pool.push(r);

  let selectedRounds = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    // Shuffle and pick
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    selectedRounds = shuffled.slice(0, numMayhemRounds).sort((a, b) => a - b);

    // Check minimum gap
    let ok = true;
    for (let i = 1; i < selectedRounds.length; i++) {
      if (selectedRounds[i] - selectedRounds[i - 1] < minGap) {
        ok = false;
        break;
      }
    }
    if (ok) break;
  }

  selectedRounds.forEach(round => {
    mayhemRounds.push({ round, multiplier: 2 });
  });

  return mayhemRounds;
};

// Create new game
router.post('/', auth, async (req, res) => {
  try {
    const { players, enforceBidCap } = req.body;
    const gameId = uuidv4();
    
    // Generate mayhem rounds for this game
    const mayhemRounds = generateMayhemRounds(players.length);

    const game = new Game({
      userId: req.user._id,
      gameId,
      players: players.map(p => ({
        name: p.name,
        cardId: p.cardId || null,
        photo: p.photo || null,
        score: 0,
        wins: 0,
        totalRounds: 0,
        totalBids: 0,
        zeros: 0
      })),
      mayhemRounds: mayhemRounds.map(m => m.round), // Store just round numbers in Game model
      currentRound: 1,
      phase: 'BID',
      gameState: {
        players: players.map(p => ({
          name: p.name,
          score: 0,
          bid: null,
          tempRes: null,
          wins: 0,
          totalRounds: 0,
          totalBids: 0,
          zeros: 0,
          streak: 0,
          lastDelta: 0,
          cardId: p.cardId || null,
          photo: p.photo || null
        })),
        round: 1,
        phase: 'BID',
        orderIndices: [],
        pendingChaos: false,
        pendingChaosLastIdx: null,
        currentMayhemMultiplier: 1,
        mayhemRounds: mayhemRounds, // Store full objects with multipliers in gameState
        selectedPlayerCards: [],
        history: []
      }
    });

    await game.save();
    res.status(201).json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update game state
router.put('/:gameId/state', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { gameState, currentRound, phase } = req.body;

    const game = await Game.findOne({ gameId, userId: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (gameState) {
      // Merge gameState instead of replacing
      game.gameState = {
        ...game.gameState,
        ...gameState,
        players: gameState.players || game.gameState.players
      };
    }
    if (currentRound !== undefined) game.currentRound = currentRound;
    if (phase) {
      game.phase = phase;
      if (game.gameState) {
        game.gameState.phase = phase;
      }
    }

    await game.save();
    res.json(game);
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Finish game
router.post('/:gameId/finish', auth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { rounds, mayhemRounds } = req.body;

    const game = await Game.findOne({ gameId, userId: req.user._id });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    game.rounds = rounds;
    game.mayhemRounds = mayhemRounds || [];
    game.players = game.gameState.players.map(p => ({
      name: p.name,
      cardId: p.cardId,
      photo: p.photo,
      score: p.score,
      wins: p.wins,
      totalRounds: p.totalRounds,
      totalBids: p.totalBids,
      zeros: p.zeros
    }));
    // Don't set phase to 'FINISHED' - Game model only allows 'BID' or 'RESULT'
    // Instead, we'll mark the game as completed by saving final state
    game.gameState.phase = 'RESULT';
    game.phase = 'RESULT';

    await game.save();

    // Add game reference to user (only gameId, not full data)
    const user = await User.findById(req.user._id);
    if (!user.games.includes(gameId)) {
      user.games.push(gameId);
      await user.save();
    }

    // Note: Player statistics are now calculated dynamically from Games collection
    // See /api/users/stats/:cardId endpoint for real-time stats calculation

    res.json({ message: 'Game finished successfully', game });
  } catch (error) {
    console.error('Finish game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
