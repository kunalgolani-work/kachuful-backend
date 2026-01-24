/**
 * Migration Script: Convert user.games from objects to game ID references
 * 
 * This script migrates the old format where user.games contained full game objects
 * to the new format where user.games only contains game ID strings (references).
 * 
 * Usage:
 *   node scripts/migrate-games-to-references.js
 * 
 * Or with custom MongoDB URI:
 *   MONGODB_URI="your-connection-string" node scripts/migrate-games-to-references.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Game = require('../models/Game');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dbQH:kunal2001@clusterqh.pvbet.mongodb.net/kachuful?retryWrites=true&w=majority';

async function migrateGames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to process\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Check if games array exists and is valid
        if (!user.games) {
          console.log(`⚠️  User "${user.username}": games field is undefined/null, initializing...`);
          user.games = [];
          await user.save();
          skippedCount++;
          continue;
        }

        if (!Array.isArray(user.games)) {
          console.log(`⚠️  User "${user.username}": games field is not an array (type: ${typeof user.games}), initializing...`);
          user.games = [];
          await user.save();
          skippedCount++;
          continue;
        }

        // Check if games array is empty
        if (user.games.length === 0) {
          console.log(`⏭️  User "${user.username}": No games, skipping`);
          skippedCount++;
          continue;
        }

        // Check if first element is an object (old format) or string (new format)
        const firstGame = user.games[0];
        if (typeof firstGame === 'string') {
          console.log(`✅ User "${user.username}": Already migrated (${user.games.length} game IDs)`);
          skippedCount++;
          continue;
        }

        // Old format detected - extract game IDs
        console.log(`🔄 User "${user.username}": Migrating ${user.games.length} games...`);

        // Extract game IDs from objects, handling both 'id' and 'gameId' fields
        const gameIds = user.games
          .map(game => {
            if (typeof game === 'object' && game !== null) {
              return game.id || game.gameId || null;
            }
            return null;
          })
          .filter(Boolean); // Remove null/undefined values

        // Remove duplicates (keep unique game IDs)
        const uniqueGameIds = [...new Set(gameIds)];

        console.log(`   Found ${gameIds.length} game IDs (${uniqueGameIds.length} unique)`);

        // Verify these games exist in Games collection for this user
        const existingGames = await Game.find({
          userId: user._id,
          gameId: { $in: uniqueGameIds }
        });

        const validGameIds = existingGames.map(g => g.gameId);
        const invalidGameIds = uniqueGameIds.filter(id => !validGameIds.includes(id));

        if (invalidGameIds.length > 0) {
          console.log(`   ⚠️  Warning: ${invalidGameIds.length} game IDs not found in Games collection:`);
          invalidGameIds.forEach(id => console.log(`      - ${id}`));
        }

        if (validGameIds.length === 0) {
          console.log(`   ⚠️  No valid games found, clearing games array`);
          user.games = [];
        } else {
          // Update user with only game IDs
          user.games = validGameIds;
          console.log(`   ✅ Migrated to ${validGameIds.length} game ID references`);
        }

        await user.save();
        migratedCount++;

        // Show comparison
        const removedCount = gameIds.length - validGameIds.length;
        if (removedCount > 0) {
          console.log(`   📉 Removed ${removedCount} invalid/duplicate game references`);
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`❌ Error migrating user "${user.username}":`, error.message);
        console.error(`   Stack:`, error.stack);
        console.error(`   User games type:`, typeof user.games);
        console.error(`   User games value:`, user.games);
        errors.push({ username: user.username, error: error.message });
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped:  ${skippedCount} users (already migrated or no games)`);
    console.log(`❌ Errors:   ${errorCount} users`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ username, error }) => {
        console.log(`   - ${username}: ${error}`);
      });
    }

    console.log('\n✅ Migration complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify data in MongoDB Compass');
    console.log('   2. Test the new stats endpoint: GET /api/users/stats/:cardId');
    console.log('   3. Check PlayerStatisticsScreen in mobile app');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  migrateGames();
}

module.exports = migrateGames;
