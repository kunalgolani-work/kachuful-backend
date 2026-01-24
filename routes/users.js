const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/users/stats/:cardId
// @desc    Get player statistics calculated dynamically from Games collection
// @access  Private
router.get('/stats/:cardId', auth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user._id;

    // Find the player card
    const user = await User.findById(userId);
    const playerCard = user.playerCards.find(c => c.id === cardId);
    
    if (!playerCard) {
      return res.status(404).json({ message: 'Player card not found' });
    }

    // Get all finished games for this user where the cardId participated
    const games = await Game.find({
      userId: userId,
      phase: 'RESULT', // Only finished games
      'players.cardId': cardId
    }).sort({ date: -1 });

    // Calculate overall statistics
    let gamesPlayed = 0;
    let gamesWon = 0;
    let totalRounds = 0;
    let totalWins = 0;
    let totalScore = 0;
    let highestScore = 0;

    // Process each game
    games.forEach(game => {
      const player = game.players.find(p => p.cardId === cardId);
      if (!player) return;

      gamesPlayed++;
      totalRounds += player.totalRounds || 0;
      totalWins += player.wins || 0;
      totalScore += player.score || 0;
      
      if (player.score > highestScore) {
        highestScore = player.score;
      }

      // Check if this player won the game
      const sortedPlayers = [...game.players].sort((a, b) => (b.score || 0) - (a.score || 0));
      if (sortedPlayers[0] && sortedPlayers[0].cardId === cardId) {
        gamesWon++;
      }
    });

    // Calculate suit-based statistics
    const suitStats = {
      Spades: { wins: 0, rounds: 0, totalPoints: 0 },
      Hearts: { wins: 0, rounds: 0, totalPoints: 0 },
      Clubs: { wins: 0, rounds: 0, totalPoints: 0 },
      Diamonds: { wins: 0, rounds: 0, totalPoints: 0 }
    };

    // Process game history for suit stats
    games.forEach(game => {
      const player = game.players.find(p => p.cardId === cardId);
      if (!player || !game.gameState?.history) return;

      // Process each round in history
      game.gameState.history.forEach((roundEntry, index) => {
        const suitIndex = (roundEntry.round - 1) % 4;
        const suitNames = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
        const suitName = suitNames[suitIndex];

        if (suitStats[suitName]) {
          suitStats[suitName].rounds++;
          
          // Check if player won this round
          const roundPlayer = roundEntry.players?.find(p => p.cardId === cardId);
          if (roundPlayer && roundPlayer.tempRes > 0) {
            suitStats[suitName].wins++;
            suitStats[suitName].totalPoints += roundPlayer.tempRes || 0;
          }
        }
      });
    });

    // Find best and worst suit
    let bestSuit = null;
    let worstSuit = null;
    let bestRate = 0;
    let worstRate = 1;

    Object.entries(suitStats).forEach(([suitName, data]) => {
      if (data.rounds > 0) {
        const rate = data.wins / data.rounds;
        if (rate > bestRate) {
          bestRate = rate;
          bestSuit = suitName;
        }
        if (rate < worstRate) {
          worstRate = rate;
          worstSuit = suitName;
        }
      }
    });

    // Prepare recent games (last 10)
    const recentGames = games.slice(0, 10).map(game => {
      const player = game.players.find(p => p.cardId === cardId);
      const sortedPlayers = [...game.players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const rank = sortedPlayers.findIndex(p => p.cardId === cardId) + 1;

      return {
        id: game.gameId,
        date: game.date,
        rounds: game.rounds || 0,
        players: game.players.map(p => ({
          name: p.name,
          cardId: p.cardId,
          photo: p.photo,
          score: p.score,
          wins: p.wins,
          totalRounds: p.totalRounds,
          totalBids: p.totalBids,
          zeros: p.zeros
        })),
        mayhemRounds: game.mayhemRounds || [],
        playerStats: {
          score: player?.score || 0,
          wins: player?.wins || 0,
          totalRounds: player?.totalRounds || 0,
          rank: rank
        }
      };
    });

    // Return comprehensive stats
    res.json({
      playerCard: {
        id: playerCard.id,
        name: playerCard.name,
        photo: playerCard.photo
      },
      overallStats: {
        gamesPlayed,
        gamesWon,
        totalRounds,
        totalWins,
        totalScore,
        highestScore,
        winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
        avgScore: gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0
      },
      suitStats: {
        stats: suitStats,
        bestSuit,
        worstSuit,
        bestRate: bestSuit ? bestRate : 0,
        worstRate: worstSuit ? worstRate : 0
      },
      recentGames
    });
  } catch (error) {
    console.error('Get player stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
