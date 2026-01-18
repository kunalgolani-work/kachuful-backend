const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
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
  mayhemRounds: [Number],
  currentRound: {
    type: Number,
    default: 1
  },
  phase: {
    type: String,
    enum: ['BID', 'RESULT'],
    default: 'BID'
  },
  gameState: {
    players: [{
      name: String,
      score: { type: Number, default: 0 },
      bid: Number,
      tempRes: Number,
      wins: { type: Number, default: 0 },
      totalRounds: { type: Number, default: 0 },
      totalBids: { type: Number, default: 0 },
      zeros: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      lastDelta: Number,
      cardId: String,
      photo: String
    }],
    round: Number,
    phase: String,
    orderIndices: [Number],
    pendingChaos: Boolean,
    pendingChaosLastIdx: Number,
    currentMayhemMultiplier: { type: Number, default: 1 },
    selectedPlayerCards: [String]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Game', gameSchema);
