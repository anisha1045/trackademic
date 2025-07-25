import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dngupcbrjykhcemsxjko.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZ3VwY2JyanlraGNlbXN4amtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzYyMTgsImV4cCI6MjA2ODk1MjIxOH0.ipXSLb5f_joggPNXyloVX6GmVFRrFxG4d95muAdUZXA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
