# Kachuful Backend API

Backend server for Kachuful card game tracker.

## Quick Deploy

### Railway (Recommended)
1. Push this folder to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Select this repository
5. Add environment variable: `MONGODB_URI`
6. Deploy!

### Render
1. Push this folder to GitHub
2. Go to https://render.com
3. New Web Service → Connect GitHub
4. Root Directory: `kachuful-app/server`
5. Build: `npm install`
6. Start: `npm start`
7. Add environment variable: `MONGODB_URI`

## Environment Variables

- `MONGODB_URI` - MongoDB connection string (required)
- `PORT` - Server port (auto-set by platform)

## Local Development

```bash
npm install
npm start
```

Server runs on http://localhost:5000

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/games` - Get user's games
- `POST /api/games` - Create game
- `GET /api/games/:id` - Get game details
- `POST /api/players` - Create player
- `GET /api/players` - Get user's players
