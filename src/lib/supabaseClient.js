import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://tegdcvbfpymmlidvuian.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ2RjdmJmcHltbWxpZHZ1aWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTY0NDYsImV4cCI6MjA4ODA3MjQ0Nn0.pbEaTGdWOp2o43bn8pPcyuq9oEwmaE1Jot1rO3mhi9M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);