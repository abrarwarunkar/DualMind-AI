const { createClient } = require('@supabase/supabase-js');
const keys = require('./keys');

let supabase = null;

const connectDB = async () => {
  try {
    supabase = createClient(keys.SUPABASE_URL, keys.SUPABASE_SERVICE_KEY);

    // Verify connection with a simple query
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('0 rows')) {
      throw error;
    }
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error(`❌ Supabase connection error: ${error.message}`);
    process.exit(1);
  }
};

const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase not initialized. Call connectDB() first.');
  }
  return supabase;
};

module.exports = connectDB;
module.exports.getSupabase = getSupabase;
