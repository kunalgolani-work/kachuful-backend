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

// Create new game
router.post('/', auth, async (req, res) => {
  try {
    const { players, enforceBidCap } = req.body;
    const gameId = uuidv4();

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

    // Update user's game history
    const user = await User.findById(req.user._id);
    user.games.push({
      id: gameId,
      date: game.date,
      rounds: game.rounds,
      players: game.players,
      mayhemRounds: game.mayhemRounds
    });

    // Update player card stats
    game.players.forEach(player => {
      if (player.cardId) {
        const card = user.playerCards.find(c => c.id === player.cardId);
        if (card) {
          card.stats.gamesPlayed++;
          card.stats.totalRounds += player.totalRounds;
          card.stats.wins += player.wins;
          card.stats.totalScore += player.score;
          if (player.score > card.stats.highestScore) {
            card.stats.highestScore = player.score;
          }
          
          const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
          if (sortedPlayers[0].name === player.name) {
            card.stats.gamesWon++;
          }
        }
      }
    });

    await user.save();

    res.json({ message: 'Game finished successfully', game });
  } catch (error) {
    console.error('Finish game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
