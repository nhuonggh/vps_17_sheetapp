import { createClient } from '@supabase/supabase-js';

// Dùng giá trị giả (placeholder) nếu không tìm thấy biến môi trường lúc Build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjgzMDQsImV4cCI6MjA4MjA0NDMwNH0.YI9iWDpg3zYkVsPRhs-re7k_0270l2cwXdEEIdognuY';

export const supabase = createClient(supabaseUrl, supabaseKey);