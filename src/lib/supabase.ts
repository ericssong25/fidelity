import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zmrquxyihakfguzsbkfg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnF1eHlpaGFrZmd1enNia2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MDU0MzIsImV4cCI6MjA5MzE4MTQzMn0.L4ZXSfr1WmY5FoIDs47yU3f0woEGNYakEHwF43M5mjA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
