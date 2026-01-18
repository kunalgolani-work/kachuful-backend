const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  playerCards: [{
    id: String,
    name: String,
    photo: String,
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      totalRounds: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 }
    }
  }],
  games: [{
    id: String,
    date: Date,
    rounds: Number,
    players: [{
      name: String,
      cardId: String,
      photo: String,
      score: Number,
      wins: Number,
      totalRounds: Number,
      totalBids: Number,
      zeros: Number
    }],
    mayhemRounds: [Number]
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
