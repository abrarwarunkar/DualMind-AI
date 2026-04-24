const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/db');

class User {
    /**
     * Create a new user (hashes password automatically)
     */
    static async create({ name, email, password }) {
        const supabase = getSupabase();
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('users')
            .insert({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
            })
            .select('id, name, email, subscription_type, avatar, created_at, updated_at')
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('An account with this email already exists');
            }
            throw error;
        }

        return User._format(data);
    }

    /**
     * Find one user by filter (e.g. { email })
     * Supports options.selectPassword to include password field
     */
    static async findOne(filter, options = {}) {
        const supabase = getSupabase();
        let query = supabase.from('users');

        const columns = options.selectPassword
            ? '*'
            : 'id, name, email, subscription_type, github_token, avatar, created_at, updated_at';

        query = query.select(columns);

        // Apply filters
        for (const [key, value] of Object.entries(filter)) {
            const col = User._toColumn(key);
            query = query.eq(col, value);
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            throw error;
        }

        const user = User._format(data);
        if (options.selectPassword && data.password) {
            user.password = data.password;
        }
        return user;
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        return User.findOne({ id });
    }

    /**
     * Update user by ID
     */
    static async findByIdAndUpdate(id, updates) {
        const supabase = getSupabase();
        const dbUpdates = {};

        for (const [key, value] of Object.entries(updates)) {
            dbUpdates[User._toColumn(key)] = value;
        }

        const { data, error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', id)
            .select('id, name, email, subscription_type, github_token, avatar, created_at, updated_at')
            .single();

        if (error) throw error;
        return User._format(data);
    }

    /**
     * Compare entered password with hashed password
     */
    async comparePassword(enteredPassword) {
        return bcrypt.compare(enteredPassword, this.password);
    }

    /**
     * Map JS camelCase keys to Postgres snake_case columns
     */
    static _toColumn(key) {
        const map = {
            githubToken: 'github_token',
            subscriptionType: 'subscription_type',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };
        return map[key] || key;
    }

    /**
     * Format a Supabase row into an app-friendly object
     */
    static _format(row) {
        if (!row) return null;
        const user = new User();
        user.id = row.id;
        user._id = row.id; // backwards compat
        user.name = row.name;
        user.email = row.email;
        user.subscriptionType = row.subscription_type || 'basic';
        user.githubToken = row.github_token;
        user.avatar = row.avatar;
        user.createdAt = row.created_at;
        user.updatedAt = row.updated_at;
        return user;
    }
}

module.exports = User;
