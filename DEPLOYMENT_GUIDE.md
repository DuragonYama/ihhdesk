# PWA Deployment Guide - OFA Employee & Admin Portals

## ✅ PWA Setup Complete

Both frontends are now configured as Progressive Web Apps (PWAs) ready for Vercel deployment.

### What's Been Set Up:

**Employee Frontend:**
- ✅ PWA manifest.json
- ✅ Service worker (sw.js)
- ✅ Updated index.html with PWA meta tags
- ✅ Service worker registration in main.tsx
- ✅ Vercel.json configuration
- ✅ .env.production template
- ✅ Icon placeholders (icon-192.txt, icon-512.txt)

**Admin Frontend:**
- ✅ PWA manifest.json
- ✅ Service worker (sw.js)
- ✅ Updated index.html with PWA meta tags
- ✅ Service worker registration in main.tsx
- ✅ Vercel.json configuration
- ✅ .env.production template
- ✅ Icon placeholders (icon-192.txt, icon-512.txt)

**Backend:**
- ✅ CORS updated with Vercel URL placeholders
- ✅ Password reset links support production environment

---

## 📝 Before Deployment - Create PWA Icons

You need to create icon files for both apps:

### Icon Requirements:
- **Sizes needed:** 192x192 and 512x512 pixels
- **Format:** PNG
- **Design:**
  - Background: Black (#0a0a0a)
  - Primary color: Red (#ef4444)
  - Text: "OFA" logo
  - Employee: Add "E" badge or user icon
  - Admin: Add "A" badge or shield icon

### Tools:
- Figma
- Canva
- https://realfavicongenerator.net/

### File Locations:
Replace the `.txt` placeholder files with actual `.png` files:

```
employee-frontend/public/icon-192.png
employee-frontend/public/icon-512.png
admin-frontend/public/icon-192.png
admin-frontend/public/icon-512.png
```

---

## 🚀 Deployment Steps

### 1. Push to GitHub

```bash
cd /home/omer/Documents/Code/ihhdesk
git add .
git commit -m "PWA setup for Vercel deployment"
git push
```

If you don't have a GitHub repository yet:
```bash
git init
git add .
git commit -m "Initial commit - PWA setup"
git branch -M main
git remote add origin https://github.com/yourusername/ihhdesk.git
git push -u origin main
```

### 2. Deploy Employee Frontend to Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import from GitHub
4. Select your repository
5. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `employee-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. Add Environment Variable:
   - **Key:** `VITE_API_URL`
   - **Value:** Your backend API URL (e.g., `https://your-backend-api.com`)

7. Click **Deploy**

8. Copy the deployment URL (e.g., `https://ofa-employee.vercel.app`)

### 3. Deploy Admin Frontend to Vercel

1. Click **"New Project"** again
2. Import same repository
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `admin-frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. Add Environment Variable:
   - **Key:** `VITE_API_URL`
   - **Value:** Your backend API URL (same as employee)

5. Click **Deploy**

6. Copy the deployment URL (e.g., `https://ofa-admin.vercel.app`)

### 4. Update Backend Configuration

**Update `backend/.env` file with your Vercel URLs:**

```bash
# Frontend URLs - PRODUCTION
EMPLOYEE_FRONTEND_URL=https://your-employee-app.vercel.app
ADMIN_FRONTEND_URL=https://your-admin-app.vercel.app
```

That's it! All CORS and password reset links are automatically configured from these environment variables.

**No code changes needed** - everything is configured via `.env`

### 5. Restart Backend

After updating `.env` file, restart your backend server to apply the new URLs.

---

## 🧪 Testing PWA Locally

Before deploying, test the PWA functionality locally:

### Employee Frontend:
```bash
cd employee-frontend
npm run build
npm run preview
```
Open http://localhost:4173

### Admin Frontend:
```bash
cd admin-frontend
npm run build
npm run preview
```
Open http://localhost:4173

### PWA Checklist:
- [ ] Open DevTools → Application → Manifest (should show OFA manifest)
- [ ] Service Worker registered (Application → Service Workers)
- [ ] Install prompt appears in address bar
- [ ] Can install as PWA
- [ ] Works offline (basic functionality)

---

## 📱 PWA Features

After deployment, users can:

### Mobile (iOS/Android):
1. Open the Vercel URL in browser
2. Tap "Add to Home Screen" (browser menu)
3. App icon appears on home screen
4. Opens like a native app (no browser UI)

### Desktop (Chrome/Edge):
1. Open the Vercel URL
2. Click install icon in address bar
3. App opens in standalone window
4. Can pin to taskbar/dock

### Offline Support:
- Service worker caches app shell
- Network-first strategy for API calls
- Fallback to cache when offline

---

## 🔧 Environment Variables Summary

### Employee Frontend (.env.production):
```
VITE_API_URL=https://your-backend-api.com
```

### Admin Frontend (.env.production):
```
VITE_API_URL=https://your-backend-api.com
```

### Backend (.env):
```bash
# Local Development
EMPLOYEE_FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174

# Production (update with your actual URLs)
# EMPLOYEE_FRONTEND_URL=https://your-employee-app.vercel.app
# ADMIN_FRONTEND_URL=https://your-admin-app.vercel.app
```

**To switch to production:** Simply update the URLs in `backend/.env` and restart the server. No code changes needed!

---

## 📊 Post-Deployment Verification

After deployment, verify:

### Both Frontends:
- [ ] Apps load correctly on Vercel URLs
- [ ] Login works
- [ ] API calls succeed (check Network tab)
- [ ] PWA manifest loads (DevTools → Application → Manifest)
- [ ] Service worker registers
- [ ] Can install as PWA
- [ ] Correct theme color (#ef4444) shows in browser UI

### Password Reset Flow:
- [ ] Employee reset email contains employee frontend URL
- [ ] Admin reset email contains admin frontend URL
- [ ] Reset links work and redirect to correct frontend
- [ ] Password reset completes successfully

### CORS:
- [ ] No CORS errors in browser console
- [ ] All API calls work from deployed frontends

---

## 🎨 Custom Domain (Optional)

To add a custom domain to your Vercel deployments:

1. Go to your Vercel project
2. Click **Settings** → **Domains**
3. Add your domain (e.g., `employee.ofa.com`)
4. Follow Vercel's DNS configuration instructions
5. Update backend CORS with new domain
6. Update password reset links with new domain

---

## 🐛 Troubleshooting

### PWA not installing:
- Check manifest.json is accessible (`/manifest.json`)
- Verify HTTPS (required for PWA, Vercel provides this)
- Check icon files exist (icon-192.png, icon-512.png)

### CORS errors:
- Verify backend CORS includes Vercel URLs
- Check credentials are enabled
- Ensure no trailing slashes in URLs

### API calls fail:
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend is running and accessible
- Verify CORS configuration

### Service worker not registering:
- Check `/sw.js` is accessible
- Verify HTTPS (required for service workers)
- Check browser console for errors

---

## 🎯 Summary

Your OFA Employee and Admin portals are now:
- ✅ Progressive Web Apps
- ✅ Installable on mobile/desktop
- ✅ Offline-capable
- ✅ Vercel-ready
- ✅ Production-configured

**Next Steps:**
1. Create PWA icons (replace .txt files with .png files)
2. Push to GitHub
3. Deploy to Vercel
4. Update backend with Vercel URLs
5. Test everything works!

Good luck with your deployment! 🚀
