# 🚀 Quick Deployment Checklist

## ✅ Pre-Deployment

- [ ] Get FRED API Key from [research.stlouisfed.org/useraccount/apikey](https://research.stlouisfed.org/useraccount/apikey)
- [ ] Test app locally with `npm start`
- [ ] Push code to GitHub repository

## ✅ Railway Deployment (Recommended)

1. **Sign up**: [railway.app](https://railway.app) (use GitHub)
2. **New Project** → Deploy from GitHub repo
3. **Select repo**: Your bond-dashboard repository  
4. **Add variables**:
   - `VITE_FRED_API_KEY` = `your_api_key_here`
   - `NODE_ENV` = `production`
5. **Deploy!** 🎉

**Result**: `https://yourproject.railway.app`

## ✅ Alternative: Render (Free Forever)

1. **Sign up**: [render.com](https://render.com) (use GitHub)
2. **New Web Service** → Connect GitHub
3. **Configure**:
   - Build: `npm install && npm run build`
   - Start: `npm run start:production`
4. **Add variables** (same as above)
5. **Deploy!** 🎉

**Result**: `https://bond-dashboard.onrender.com`

## ✅ Test Your Deployment

- [ ] Visit your deployed URL
- [ ] Check `/api/health` endpoint
- [ ] Test data loading in dashboard
- [ ] Add to phone home screen

## 📱 Access from Phone

1. Open mobile browser
2. Go to your deployed URL
3. Add to Home Screen
4. Use like a native app!

---

**Need help?** Check `docs/CLOUD-DEPLOYMENT.md` for detailed instructions. 