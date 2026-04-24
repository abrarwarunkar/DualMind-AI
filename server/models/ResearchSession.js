const { getSupabase } = require('../config/db');

class ResearchSession {
    /**
     * Create a new research session
     */
    static async create(data) {
        const supabase = getSupabase();
        const row = ResearchSession._toRow(data);

        const { data: created, error } = await supabase
            .from('research_sessions')
            .insert(row)
            .select('*')
            .single();

        if (error) throw error;
        return ResearchSession._format(created);
    }

    /**
     * Find one session by filter
     */
    static async findOne(filter, options = {}) {
        const supabase = getSupabase();
        let query = supabase.from('research_sessions').select(options.select || '*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = ResearchSession._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return ResearchSession._format(data);
    }

    /**
     * Find multiple sessions by filter with sort/skip/limit
     */
    static async find(filter = {}, options = {}) {
        const supabase = getSupabase();
        let query = supabase.from('research_sessions').select(options.select || '*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else if (key === '$text') {
                // Text search: use ilike on query column
                query = query.ilike('query', `%${value.$search}%`);
            } else if (key === 'entities_exist') {
                // Filter sessions that have entities
                query = query.not('entities', 'eq', '[]');
            } else {
                const col = ResearchSession._toColumn(key);
                query = query.eq(col, value);
            }
        }

        // Sorting
        if (options.sort) {
            for (const [field, dir] of Object.entries(options.sort)) {
                const col = ResearchSession._toColumn(field);
                query = query.order(col, { ascending: dir === 1 });
            }
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        if (options.skip !== undefined && options.limit !== undefined) {
            query = query.range(options.skip, options.skip + options.limit - 1);
        } else if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []).map(ResearchSession._format);
    }

    /**
     * Count documents matching a filter
     */
    static async countDocuments(filter = {}) {
        const supabase = getSupabase();
        let query = supabase.from('research_sessions').select('id', { count: 'exact', head: true });

        for (const [key, value] of Object.entries(filter)) {
            if (key === '$text') {
                query = query.ilike('query', `%${value.$search}%`);
            } else {
                const col = ResearchSession._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    }

    /**
     * Delete one session and return it
     */
    static async findOneAndDelete(filter) {
        const supabase = getSupabase();
        let query = supabase.from('research_sessions').delete().select('*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = ResearchSession._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return ResearchSession._format(data);
    }

    /**
     * Save (update) the current session instance
     */
    async save() {
        const supabase = getSupabase();
        const row = ResearchSession._toRow(this);
        delete row.id;
        delete row.created_at;

        const { data, error } = await supabase
            .from('research_sessions')
            .update(row)
            .eq('id', this.id)
            .select('*')
            .single();

        if (error) throw error;
        return Object.assign(this, ResearchSession._format(data));
    }

    /**
     * Map camelCase to snake_case
     */
    static _toColumn(key) {
        const map = {
            userId: 'user_id',
            gptResponse: 'gpt_response',
            claudeResponse: 'claude_response',
            groundedSummary: 'grounded_summary',
            hallucinationReport: 'hallucination_report',
            academicSources: 'academic_sources',
            parentSessionId: 'parent_session_id',
            chainDepth: 'chain_depth',
            compareMode: 'compare_mode',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };
        return map[key] || key;
    }

    /**
     * Convert app data to a Supabase row
     */
    static _toRow(data) {
        const row = {};
        const mapping = {
            id: 'id',
            userId: 'user_id',
            query: 'query',
            gptResponse: 'gpt_response',
            claudeResponse: 'claude_response',
            groundedSummary: 'grounded_summary',
            citations: 'citations',
            hallucinationReport: 'hallucination_report',
            sources: 'sources',
            academicSources: 'academic_sources',
            entities: 'entities',
            parentSessionId: 'parent_session_id',
            chainDepth: 'chain_depth',
            status: 'status',
            compareMode: 'compare_mode',
        };

        for (const [jsKey, dbCol] of Object.entries(mapping)) {
            if (data[jsKey] !== undefined) {
                row[dbCol] = data[jsKey];
            }
        }
        return row;
    }

    /**
     * Format a Supabase row into an app-friendly object
     */
    static _format(row) {
        if (!row) return null;
        const session = new ResearchSession();
        session.id = row.id;
        session._id = row.id; // backwards compat
        session.userId = row.user_id;
        session.query = row.query;
        session.gptResponse = row.gpt_response || {};
        session.claudeResponse = row.claude_response || {};
        session.groundedSummary = row.grounded_summary || {};
        session.citations = row.citations || [];
        session.hallucinationReport = row.hallucination_report || {};
        session.sources = row.sources || [];
        session.academicSources = row.academic_sources || [];
        session.entities = row.entities || [];
        session.parentSessionId = row.parent_session_id;
        session.chainDepth = row.chain_depth || 0;
        session.status = row.status;
        session.compareMode = row.compare_mode;
        session.createdAt = row.created_at;
        session.updatedAt = row.updated_at;
        return session;
    }
}

module.exports = ResearchSession;
