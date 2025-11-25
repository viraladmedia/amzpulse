import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Netlify deploys to the root domain by default, so we don't need the 'base' property 
    // unless you are deploying to a specific subdirectory.
    define: {
      // This allows the app to access the API_KEY set in Netlify Environment Variables
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});