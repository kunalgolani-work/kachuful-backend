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
    
    // Ensure mayhemRounds is properly formatted in gameState
    const gamesWithMayhem = games.map(game => {
      const gameObj = game.toObject();
      
      // If gameState.mayhemRounds is missing or is array of numbers, reconstruct it
      if (!gameObj.gameState?.mayhemRounds || 
          (Array.isArray(gameObj.gameState.mayhemRounds) && 
           gameObj.gameState.mayhemRounds.length > 0 && 
           typeof gameObj.gameState.mayhemRounds[0] === 'number')) {
        // Convert from numbers to objects
        const mayhemRoundsNumbers = gameObj.mayhemRounds || [];
        if (!gameObj.gameState) {
          gameObj.gameState = {};
        }
        gameObj.gameState.mayhemRounds = mayhemRoundsNumbers.map(round => ({ 
          round, 
          multiplier: 2 
        }));
      }
      
      return gameObj;
    });
    
    res.json(gamesWithMayhem);
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
    
    if (!game) {
      return res.json(null);
    }
    
    const gameObj = game.toObject();
    
    // Ensure mayhemRounds is properly formatted in gameState
    if (!gameObj.gameState?.mayhemRounds || 
        (Array.isArray(gameObj.gameState.mayhemRounds) && 
         gameObj.gameState.mayhemRounds.length > 0 && 
         typeof gameObj.gameState.mayhemRounds[0] === 'number')) {
      // Convert from numbers to objects
      const mayhemRoundsNumbers = gameObj.mayhemRounds || [];
      if (!gameObj.gameState) {
        gameObj.gameState = {};
      }
      gameObj.gameState.mayhemRounds = mayhemRoundsNumbers.map(round => ({ 
        round, 
        multiplier: 2 
      }));
    }
    
    res.json(gameObj);
  } catch (error) {
    console.error('Get active game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate special rounds with 5-8 round gap (less overload, more breathing room)
const MIN_GAP = 5;
const MAX_GAP = 8;
const TYPICAL_ROUNDS = 20;

const placeSpecialRoundsWithSpacing = (numSlots, excludeRounds = []) => {
  const exclude = new Set(excludeRounds);
  const pool = [];
  for (let r = 2; r <= Math.min(TYPICAL_ROUNDS, 28); r++) {
    if (!exclude.has(r)) pool.push(r);
  }
  if (pool.length < numSlots) return [];

  // Place first slot, then each next 3-6 rounds apart
  const placed = [];
  let lastRound = 0;
  for (let i = 0; i < numSlots; i++) {
    const minNext = lastRound + MIN_GAP;
    const maxNext = lastRound + MAX_GAP;
    const candidates = pool.filter(r => r >= minNext && r <= maxNext);
    if (candidates.length === 0) {
      const fallback = pool.filter(r => r > lastRound);
      if (fallback.length === 0) break;
      const pick = fallback[0];
      placed.push(pick);
      lastRound = pick;
      pool.splice(pool.indexOf(pick), 1);
    } else {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      placed.push(pick);
      lastRound = pick;
      pool.splice(pool.indexOf(pick), 1);
    }
  }
  return placed.sort((a, b) => a - b);
};

// Generate Mayhem rounds (spaced 5-8 apart, fewer rounds)
const generateMayhemRounds = (numPlayers) => {
  const numMayhem = 2 + Math.floor(Math.random() * 2); // 2-3 mayhem rounds
  const rounds = placeSpecialRoundsWithSpacing(numMayhem, []);
  return rounds.map(round => ({ round, multiplier: 2 }));
};

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };

const pickRandomJokerCard = () => {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return {
    suit, rank,
    label: `${rank} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
    symbol: SUIT_SYMBOLS[suit]
  };
};

const generateJokerRounds = (mayhemRoundNumbers) => {
  const numJoker = 1 + Math.floor(Math.random() * 2); // 1-2 joker rounds
  const rounds = placeSpecialRoundsWithSpacing(numJoker, mayhemRoundNumbers || []);
  return rounds.map(round => ({ round, ...pickRandomJokerCard() }));
};

const generateTeamUpRounds = (numPlayers, mayhemRoundNumbers, jokerRoundNumbers) => {
  if (numPlayers % 2 !== 0) return [];
  const exclude = [...(mayhemRoundNumbers || []), ...((jokerRoundNumbers || []).map(j => typeof j === 'object' ? j.round : j))];
  const numTeam = 1; // 1 team round
  const rounds = placeSpecialRoundsWithSpacing(numTeam, exclude);
  return rounds;
};

// Create new game
router.post('/', auth, async (req, res) => {
  try {
    const { players, enforceBidCap } = req.body;
    const gameId = uuidv4();
    
    // Generate special rounds with 3-6 gap between each
    const mayhemRounds = generateMayhemRounds(players.length);
    const mayhemRoundNumbers = mayhemRounds.map(m => m.round);
    const jokerRounds = generateJokerRounds(mayhemRoundNumbers);
    const jokerRoundNumbers = (jokerRounds || []).map(j => j.round);
    const teamUpRounds = generateTeamUpRounds(players.length, mayhemRoundNumbers, jokerRoundNumbers);

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
      mayhemRounds: mayhemRounds.map(m => m.round),
      jokerRounds,
      teamUpRounds,
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
        mayhemRounds: mayhemRounds,
        jokerRounds,
        teamUpRounds,
        teamPairs: [],
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
      // Preserve mayhemRounds if not provided in update
      game.gameState = {
        ...game.gameState,
        ...gameState,
        players: gameState.players || game.gameState.players,
        // Preserve mayhemRounds, jokerRounds, teamUpRounds, teamPairs if not being updated
        mayhemRounds: gameState.mayhemRounds !== undefined ? gameState.mayhemRounds : game.gameState.mayhemRounds,
        jokerRounds: gameState.jokerRounds !== undefined ? gameState.jokerRounds : game.gameState.jokerRounds,
        teamUpRounds: gameState.teamUpRounds !== undefined ? gameState.teamUpRounds : game.gameState.teamUpRounds,
        teamPairs: gameState.teamPairs !== undefined ? gameState.teamPairs : game.gameState.teamPairs
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
    
    // Preserve mayhemRounds from gameState if not provided, or convert from objects to round numbers
    if (mayhemRounds && mayhemRounds.length > 0) {
      // If mayhemRounds is array of objects, extract round numbers
      if (typeof mayhemRounds[0] === 'object' && mayhemRounds[0].round) {
        game.mayhemRounds = mayhemRounds.map(m => m.round);
      } else {
        // Already array of numbers
        game.mayhemRounds = mayhemRounds;
      }
    } else if (game.gameState?.mayhemRounds && game.gameState.mayhemRounds.length > 0) {
      // Extract round numbers from gameState.mayhemRounds objects
      game.mayhemRounds = game.gameState.mayhemRounds.map(m => 
        typeof m === 'object' ? m.round : m
      );
    } else {
      // Fallback to existing mayhemRounds or empty array
      game.mayhemRounds = game.mayhemRounds || [];
    }
    
    // Preserve mayhemRounds in gameState as well
    if (game.gameState) {
      game.gameState.mayhemRounds = game.gameState.mayhemRounds || 
        game.mayhemRounds.map(round => ({ round, multiplier: 2 }));
    }
    
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
