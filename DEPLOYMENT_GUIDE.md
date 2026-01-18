# 🚀 Backend Deployment Guide

Deploy your Kachuful backend to the cloud so you don't need to run it locally!

## Quick Options (Recommended)

### Option 1: Railway (Easiest & Free) ⭐ RECOMMENDED
**Best for:** Quick deployment, free tier available

1. **Sign up:** https://railway.app (use GitHub login)
2. **Create new project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or upload code)
3. **Configure:**
   - Root Directory: `kachuful-app/server`
   - Start Command: `npm start`
4. **Set environment variable:**
   - Go to Variables tab
   - Add: `MONGODB_URI` = `mongodb+srv://dbQH:kunal2001@clusterqh.pvbet.mongodb.net/kachuful?retryWrites=true&w=majority`
5. **Deploy:**
   - Railway auto-deploys
   - Get your URL: `https://your-app.railway.app`
   - **Use this URL in your mobile app!**

**Free tier:** 500 hours/month, $5 credit

---

### Option 2: Render (Free Tier Available)
**Best for:** Simple deployment, good free tier

1. **Sign up:** https://render.com
2. **Create new Web Service:**
   - Connect GitHub repo
   - Root Directory: `kachuful-app/server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Set environment variable:**
   - Add: `MONGODB_URI` = `mongodb+srv://dbQH:kunal2001@clusterqh.pvbet.mongodb.net/kachuful?retryWrites=true&w=majority`
4. **Deploy:**
   - Render auto-deploys
   - Get your URL: `https://your-app.onrender.com`
   - **Use this URL in your mobile app!**

**Free tier:** Spins down after 15 min inactivity (wakes on request)

---

### Option 3: Heroku (Classic, Still Works)
**Best for:** Established platform, reliable

1. **Install Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli
2. **Login:**
   ```bash
   heroku login
   ```
3. **Create app:**
   ```bash
   cd D:\Kachuful\kachuful-app\server
   heroku create kachuful-backend
   ```
4. **Set environment variable:**
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://dbQH:kunal2001@clusterqh.pvbet.mongodb.net/kachuful?retryWrites=true&w=majority"
   ```
5. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```
6. **Get URL:**
   - `https://kachuful-backend.herokuapp.com`
   - **Use this URL in your mobile app!**

**Note:** Heroku free tier ended, but paid plans start at $5/month

---

## After Deployment

1. **Get your backend URL:**
   - Railway: `https://your-app.railway.app`
   - Render: `https://your-app.onrender.com`
   - Heroku: `https://your-app.herokuapp.com`

2. **Test your backend:**
   - Visit: `https://your-backend-url.com/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

3. **Update mobile app:**
   - See `APK_BUILD_GUIDE.md` in mobile folder
   - Update API URL to your deployed backend

---

## Environment Variables

Your backend needs:
- `MONGODB_URI` - Already set in code as fallback, but set in platform for security
- `PORT` - Auto-set by platform (Railway, Render, Heroku)

---

## Recommended: Railway

**Why Railway:**
- ✅ Easiest setup
- ✅ Free tier available
- ✅ Auto-deploys from GitHub
- ✅ Good performance
- ✅ Simple dashboard

**Steps:**
1. Sign up at railway.app
2. Connect GitHub
3. Deploy `kachuful-app/server` folder
4. Add `MONGODB_URI` environment variable
5. Get your URL
6. Done! 🎉

---

## Troubleshooting

**"Application error"**
- Check logs in platform dashboard
- Verify `MONGODB_URI` is set correctly
- Check build logs for errors

**"Cannot connect to MongoDB"**
- Verify MongoDB connection string is correct
- Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

**"Port already in use"**
- Platform auto-sets PORT, don't hardcode it
- Use `process.env.PORT || 5000` (already done ✅)

---

## Next Steps

After deploying backend:
1. ✅ Test backend URL works
2. ✅ Update mobile app API URL
3. ✅ Build APK (see `APK_BUILD_GUIDE.md`)
