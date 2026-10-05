import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables. Check your .env file.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithRetry,
  },
});

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxRetries = 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.status >= 500 && attempt < maxRetries) {
        await delay(300 * (attempt + 1));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await delay(300 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
