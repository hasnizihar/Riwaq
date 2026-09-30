# 🚀 Riwaq Photo Booth — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel (CDN)                    │
│         Static SPA — Vite + React Build          │
│     index.html + JS/CSS bundles + public/        │
└──────────────┬──────────────────┬────────────────┘
               │                  │
     ┌─────────▼───────┐  ┌──────▼──────────┐
     │    Supabase      │  │   Cloudinary     │
     │  (PostgreSQL DB) │  │ (Image CDN/Host) │
     │  - events        │  │ - originals/     │
     │  - photos        │  │ - generated/     │
     │  - templates     │  │ - unsigned upload │
     │  - categories    │  │                  │
     │  - RPC functions │  │                  │
     └─────────────────┘  └─────────────────┘
```

---

## Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note down:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **Anon public key** → found in **Settings → API → Project API keys**
3. Go to **SQL Editor** and run the 3 migration files in order:
   - `supabase/migrations/20260930_init_photobooth.sql`
   - `supabase/migrations/20260930_photo_privacy_and_sync_rpc.sql`
   - `supabase/migrations/20260930_security_hardening.sql`

> **Tip**: Just copy-paste each file into the SQL Editor and click **Run**.

---

## Step 2: Cloudinary Setup

1. Go to [cloudinary.com](https://cloudinary.com) → Sign up / Log in
2. From the **Dashboard**, copy your **Cloud Name** (e.g. `dcgnjhjkp`)
3. Create an **unsigned upload preset**:
   - Go to **Settings → Upload → Upload presets**
   - Click **Add upload preset**
   - Set **Signing Mode** to **Unsigned**
   - Set **Folder** to `riwaq-photobooth` (optional)
   - Save and copy the **preset name**

---

## Step 3: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select your repo
3. Vercel auto-detects Vite — settings should be:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables** (expand section during import):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJ...your-anon-key` |
   | `VITE_CLOUDINARY_CLOUD_NAME` | `your-cloud-name` |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | `your-preset-name` |
   | `VITE_APP_URL` | `https://your-project.vercel.app` |
   | `VITE_ADMIN_PIN` | `1926` |
   | `VITE_EVENT_SLUG` | `riwaq` |

5. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project directory
cd Riwaq
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_CLOUDINARY_CLOUD_NAME
vercel env add VITE_CLOUDINARY_UPLOAD_PRESET
vercel env add VITE_APP_URL
vercel env add VITE_ADMIN_PIN
vercel env add VITE_EVENT_SLUG

# Redeploy with env vars
vercel --prod
```

---

## Step 4: Update VITE_APP_URL

After the first deploy, Vercel gives you a URL like `https://riwaq-xxxxx.vercel.app`.

1. Go to **Vercel Dashboard → Settings → Environment Variables**
2. Update `VITE_APP_URL` to your actual Vercel URL (or custom domain)
3. **Redeploy** for the change to take effect

This URL is used to generate QR codes that link attendees to their photos.

---

## Custom Domain (Optional)

1. In Vercel: **Settings → Domains → Add**
2. Add your domain (e.g., `booth.riwaq-festival.org`)
3. Update DNS as instructed by Vercel
4. Update `VITE_APP_URL` to match

---

## Local Development

```bash
# Copy environment template
cp .env.example .env.local

# Fill in your actual values in .env.local

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:3000`

---

## Project Routes

| Route | Purpose |
|---|---|
| `/` | Default booth mode |
| `/e/riwaq/booth` | Event-specific booth |
| `/e/riwaq/admin` | Admin dashboard (PIN protected) |
| `/p/:token` | Public photo viewer (QR code target) |
| `/admin` | Admin shortcut |

---

## Files Modified for Deployment

| File | Change |
|---|---|
| `vercel.json` | SPA rewrite rules + caching headers |
| `package.json` | Removed server-side deps, cleaned scripts |
| `.env.example` | Comprehensive template with setup instructions |
| `.gitignore` | Added `.vercel/`, editor dirs, zip files |
| `supabaseService.ts` | Removed hardcoded credentials |
| `cloudinaryService.ts` | Removed hardcoded credentials |
