# GitHub Pages Deployment Guide

## Setup Instructions

### 1. Push Your Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Meal Tracker app"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

### 2. Configure GitHub Secrets

Go to your GitHub repository:
1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add these three secrets:

   - Name: `VITE_SUPABASE_URL`
     - Value: Your Supabase project URL
   
   - Name: `VITE_SUPABASE_ANON_KEY`
     - Value: Your Supabase anon key
   
   - Name: `VITE_OPENAI_API_KEY`
     - Value: Your OpenAI API key

### 3. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save the settings

### 4. Deploy

The app will automatically deploy when you push to the `main` branch!

Check the **Actions** tab to see the deployment progress.

Your app will be available at:
```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Install dependencies
npm install

# Build and deploy
npm run deploy
```

**Note**: For manual deployment, you need to set environment variables in your local `.env` file first.

## Updating Your App

Just push changes to the `main` branch:

```bash
git add .
git commit -m "Update app"
git push
```

The GitHub Action will automatically rebuild and redeploy!

## Important Notes

⚠️ **Environment Variables**: Your Supabase anon key will be visible in the built JavaScript files. This is normal - the anon key is designed to be public. **Never** expose your Supabase service role key!

⚠️ **First Load**: The first deployment might take 2-3 minutes. Check the Actions tab for progress.

⚠️ **Client-Side Routing**: The included `404.html` ensures React Router works correctly on page refresh.

## Troubleshooting

**404 Error on deployment:**
- Make sure GitHub Pages source is set to "GitHub Actions"
- Check the Actions tab for build errors

**Blank page:**
- Check browser console for errors
- Verify your Supabase URL in GitHub Secrets

**Authentication not working:**
- Add your GitHub Pages URL to Supabase **Authentication** → **URL Configuration** → **Redirect URLs**:
  ```
  https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
  ```
