const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get player cards
router.get('/cards', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.playerCards || []);
  } catch (error) {
    console.error('Get player cards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/Update player card
router.post('/cards', auth, async (req, res) => {
  try {
    const { id, name, photo } = req.body;
    const user = await User.findById(req.user._id);

    const existingCardIndex = user.playerCards.findIndex(c => c.id === id);
    if (existingCardIndex >= 0) {
      user.playerCards[existingCardIndex].name = name;
      if (photo) user.playerCards[existingCardIndex].photo = photo;
    } else {
      user.playerCards.push({
        id,
        name,
        photo: photo || '',
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalRounds: 0,
          wins: 0,
          totalScore: 0,
          highestScore: 0
        }
      });
    }

    await user.save();
    res.json(user.playerCards);
  } catch (error) {
    console.error('Update player card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
