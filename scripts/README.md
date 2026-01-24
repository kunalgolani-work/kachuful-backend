# Migration Scripts

## migrate-games-to-references.js

Converts `user.games` array from full game objects to game ID references (strings).

### What it does:

1. **Finds all users** in the database
2. **Detects old format**: Checks if `user.games` contains objects (old) or strings (new)
3. **Extracts game IDs**: Gets `id` or `gameId` from each game object
4. **Removes duplicates**: Ensures unique game IDs
5. **Validates games**: Verifies games exist in Games collection for that user
6. **Updates user**: Replaces `user.games` array with only game ID strings
7. **Reports results**: Shows summary of migrated/skipped/errored users

### Usage:

```bash
# From server directory
cd D:\Kachuful\kachuful-app\server

# Run migration
npm run migrate:games

# Or directly with node
node scripts/migrate-games-to-references.js

# With custom MongoDB URI
MONGODB_URI="your-connection-string" node scripts/migrate-games-to-references.js
```

### Example Output:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 1 users to process

🔄 User "Kunal": Migrating 2 games...
   Found 2 game IDs (1 unique)
   ⚠️  Warning: 0 game IDs not found in Games collection:
   ✅ Migrated to 1 game ID references
   📉 Removed 1 invalid/duplicate game references

============================================================
📊 Migration Summary
============================================================
✅ Migrated: 1 users
⏭️  Skipped:  0 users (already migrated or no games)
❌ Errors:   0 users

✅ Migration complete!
```

### Safety Features:

- ✅ **Non-destructive**: Only updates `user.games` array, doesn't delete games
- ✅ **Validation**: Verifies games exist before adding to array
- ✅ **Duplicate handling**: Removes duplicate game IDs automatically
- ✅ **Error handling**: Continues processing even if one user fails
- ✅ **Dry-run safe**: Can be run multiple times (skips already migrated users)

### Before Migration:

**Old Format (user.games):**
```javascript
games: [
  {
    id: "560b9b04-733b-429b-87eb-9bf87fe0feef",
    date: "2026-01-18T12:03:08.935Z",
    rounds: 20,
    players: [...],
    mayhemRounds: []
  },
  // ... duplicate entries
]
```

### After Migration:

**New Format (user.games):**
```javascript
games: [
  "560b9b04-733b-429b-87eb-9bf87fe0feef",
  "fa724874-47e0-42fb-adf4-74dc5ab73bb1"
]
```

### Notes:

- The script handles duplicate game IDs (like in your example where the same gameId appears twice)
- Invalid game IDs (not found in Games collection) are removed
- Already migrated users are skipped automatically
- Game data in Games collection is **not affected** - only User.games array is updated

### Troubleshooting:

**Error: "Cannot find module '../models/User'"**
- Make sure you're running from the `server` directory
- Or adjust the require paths in the script

**Error: "MongoDB connection failed"**
- Check your `MONGODB_URI` in `.env` file
- Verify network connectivity
- Check MongoDB credentials

**No games migrated:**
- Check if users already have string arrays (already migrated)
- Verify games exist in Games collection
- Check gameId format matches between collections
