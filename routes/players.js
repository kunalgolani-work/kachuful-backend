const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { v2: cloudinary } = require('cloudinary');
const router = express.Router();

// Configure Cloudinary - using free tier
// You can create a free account at https://cloudinary.com
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Helper to upload base64 image to Cloudinary
const uploadToCloudinary = async (base64Data, playerId) => {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_API_KEY) {
      console.log('Cloudinary not configured, storing image reference only');
      // Return a placeholder - image won't be stored
      return null;
    }

    // Upload base64 image
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'kachuful/players',
      public_id: playerId,
      overwrite: true,
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return null;
  }
};

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

    let photoUrl = null;

    // If photo is base64, upload to Cloudinary
    if (photo && photo.startsWith('data:image')) {
      photoUrl = await uploadToCloudinary(photo, `${user._id}_${id}`);
    } else if (photo && photo.startsWith('http')) {
      // Already a URL, keep it
      photoUrl = photo;
    }

    const existingCardIndex = user.playerCards.findIndex(c => c.id === id);
    if (existingCardIndex >= 0) {
      user.playerCards[existingCardIndex].name = name;
      if (photoUrl) {
        user.playerCards[existingCardIndex].photo = photoUrl;
      }
    } else {
      user.playerCards.push({
        id,
        name,
        photo: photoUrl || '',
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

// Delete player card
router.delete('/cards/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const cardIndex = user.playerCards.findIndex(c => c.id === req.params.id);
    
    if (cardIndex >= 0) {
      // Try to delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(`kachuful/players/${user._id}_${req.params.id}`);
      } catch (e) {}
      
      user.playerCards.splice(cardIndex, 1);
      await user.save();
    }
    
    res.json(user.playerCards);
  } catch (error) {
    console.error('Delete player card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
