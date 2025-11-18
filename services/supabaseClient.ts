
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key.
// You can find these in your Supabase project's dashboard under Project Settings > API.
export const supabaseUrl = 'https://jceqklalsprjdxdqlqgd.supabase.co'; // <-- REPLACE WITH YOUR SUPABASE URL
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZXFrbGFsc3ByamR4ZHFscWdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzIwNzUsImV4cCI6MjA3ODkwODA3NX0.B-DHYJd9Xfhulu6ETtQS-1RZHG9FacXCiohlu8m9nb8'; // <-- REPLACE WITH YOUR SUPABASE ANON KEY

export const isPlaceholder = supabaseUrl.includes('supabaseUrl') || supabaseAnonKey.includes('supabaseAnonKey');

if (isPlaceholder) {
    const warningStyle = 'background: #ffcc00; color: #333; font-size: 16px; padding: 10px; border-left: 5px solid #ff9900;';
    console.warn('%cAction Required: Update Supabase Credentials', warningStyle);
    console.warn("Please replace the placeholder Supabase URL and Anon Key in 'services/supabaseClient.ts' with your own project's credentials to connect to your database.");
}


if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);