# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Replit-hosted Digital Ledger application.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top and select **"New Project"**
3. Enter a project name (e.g., "Digital Ledger")
4. Click **"Create"**

## Step 2: Enable Google+ API

1. In your Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google+ API"
3. Click on it and then click **"Enable"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** and select **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** user type
   - Fill in the app name, user support email, and developer contact
   - Add scopes: `openid`, `profile`, `email`
   - Add test users if in testing mode
   - Save and continue

4. For OAuth client ID:
   - Application type: **"Web application"**
   - Name: "Digital Ledger Web Client"
   - Authorized JavaScript origins:
     - For development: `http://localhost:5000`
     - For production: `https://your-replit-app-name.replit.app`
   - Authorized redirect URIs:
     - For development: `http://localhost:5000/api/auth/google/callback`
     - For production: `https://your-replit-app-name.replit.app/api/auth/google/callback`
   
5. Click **"Create"**
6. Copy the **Client ID** and **Client Secret** - you'll need these for the next step

## Step 4: Configure Replit Environment Variables

In your Replit project:

1. Click on the **"Secrets"** tab (lock icon) in the left sidebar
2. Add the following secrets:

   ```
   Key: GOOGLE_CLIENT_ID
   Value: [Your Google Client ID from Step 3]
   ```

   ```
   Key: GOOGLE_CLIENT_SECRET
   Value: [Your Google Client Secret from Step 3]
   ```

   ```
   Key: GOOGLE_CALLBACK_URL
   Value: https://your-replit-app-name.replit.app/api/auth/google/callback
   ```

   **Note:** If you already have a `SESSION_SECRET`, you don't need to add it again. If not, add:
   
   ```
   Key: SESSION_SECRET
   Value: [Generate a random string - at least 32 characters]
   ```

## Step 5: Update Database Schema

Run this command to update your database with the new schema:

```bash
npm run db:push
```

This will add the `googleId` and `authProvider` fields to the users table.

## Step 6: Test Google Authentication

1. Restart your Replit application
2. Go to the login page
3. You should now see a "Sign in with Google" button
4. Click it to test the OAuth flow

## Troubleshooting

### Redirect URI mismatch error
- Make sure the redirect URI in Google Cloud Console exactly matches your Replit app URL
- Update the `GOOGLE_CALLBACK_URL` secret to match

### "This app isn't verified" warning
- This is normal for apps in development
- Click "Advanced" and then "Go to [App Name] (unsafe)" to continue
- To remove this warning, submit your app for verification in Google Cloud Console

### Session errors
- Ensure `SESSION_SECRET` is set in your Replit secrets
- Check that your database is running and accessible

### User not created after Google sign-in
- Check server logs for errors
- Verify database connection
- Ensure `googleId` and `authProvider` columns exist in users table

## Security Best Practices

1. **Never commit credentials**: Keep Client ID and Client Secret in Replit Secrets only
2. **Use HTTPS in production**: Replit apps automatically use HTTPS
3. **Restrict OAuth scopes**: Only request `profile` and `email` scopes
4. **Verify redirect URIs**: Only add trusted domains to authorized redirect URIs
5. **Enable 2FA**: For your Google Cloud Console account

## How It Works

1. User clicks "Sign in with Google"
2. User is redirected to Google's login page
3. User authorizes the app
4. Google redirects back to your callback URL with an authorization code
5. Server exchanges code for user profile information
6. Server creates or links user account
7. User is logged in and redirected to home page

## Additional Features

### Account Linking
If a user already has an account with the same email, the Google account will be automatically linked to the existing account.

### Profile Sync
User's first name, last name, and profile image are automatically pulled from their Google profile.

### No Password Required
Users who sign up with Google don't need to set a password.

## Need Help?

- Check server logs in Replit console
- Verify all environment variables are set correctly
- Ensure Google Cloud Console settings match your Replit app URL
