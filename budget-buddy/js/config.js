/**
 * BudgetBuddy - Central Website Owner Configuration
 * 
 * You (the creator) configure your database connection here ONCE.
 * Your community members will NEVER be asked for keys or database settings!
 * They simply visit your website, sign up, and log in from any phone or computer.
 */

window.BUDGETBUDDY_CONFIG = {
  // Option A: If you deploy the included Express backend (e.g. on Render, Railway, or Heroku):
  // When hosted together, leave as '/api'.
  // If hosted on a separate backend URL, set: 'https://your-budget-api.onrender.com/api'
  API_URL: window.location.origin.includes('http') ? '/api' : 'http://localhost:3000/api',

  // Option B: If you prefer static deployment (Netlify/Vercel/GitHub Pages) with a cloud database:
  // Put your Supabase project URL and anon public key here ONCE.
  // The community will automatically connect to it silently and securely!
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};
