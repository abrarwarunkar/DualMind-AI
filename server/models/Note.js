const { getSupabase } = require('../config/db');

class Note {
    /**
     * Create a new note
     */
    static async create(data) {
        const supabase = getSupabase();
        const row = Note._toRow(data);

        const { data: created, error } = await supabase
            .from('notes')
            .insert(row)
            .select('*')
            .single();

        if (error) throw error;
        return Note._format(created);
    }

    /**
     * Find multiple notes by filter
     */
    static async find(filter = {}, options = {}) {
        const supabase = getSupabase();
        let query = supabase.from('notes').select(options.select || '*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = Note._toColumn(key);
                query = query.eq(col, value);
            }
        }

        if (options.sort) {
            for (const [field, dir] of Object.entries(options.sort)) {
                const col = Note._toColumn(field);
                query = query.order(col, { ascending: dir === 1 });
            }
        } else {
            query = query.order('last_edited', { ascending: false });
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(Note._format);
    }

    /**
     * Find one note by filter
     */
    static async findOne(filter) {
        const supabase = getSupabase();
        let query = supabase.from('notes').select('*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = Note._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return Note._format(data);
    }

    /**
     * Delete one note by filter
     */
    static async findOneAndDelete(filter) {
        const supabase = getSupabase();
        let query = supabase.from('notes').delete().select('*');

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = Note._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return Note._format(data);
    }

    /**
     * Delete many notes by filter
     */
    static async deleteMany(filter) {
        const supabase = getSupabase();
        let query = supabase.from('notes').delete();

        for (const [key, value] of Object.entries(filter)) {
            if (key === '_id' || key === 'id') {
                query = query.eq('id', value);
            } else {
                const col = Note._toColumn(key);
                query = query.eq(col, value);
            }
        }

        const { error } = await query;
        if (error) throw error;
    }

    /**
     * Save (update) the current note instance
     */
    async save() {
        const supabase = getSupabase();
        const row = Note._toRow(this);
        delete row.id;
        delete row.created_at;
        row.last_edited = new Date().toISOString();

        const { data, error } = await supabase
            .from('notes')
            .update(row)
            .eq('id', this.id)
            .select('*')
            .single();

        if (error) throw error;
        return Object.assign(this, Note._format(data));
    }

    static _toColumn(key) {
        const map = {
            sessionId: 'session_id',
            userId: 'user_id',
            markdownVersion: 'markdown_version',
            lastEdited: 'last_edited',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        };
        return map[key] || key;
    }

    static _toRow(data) {
        const row = {};
        const mapping = {
            id: 'id',
            sessionId: 'session_id',
            userId: 'user_id',
            title: 'title',
            content: 'content',
            markdownVersion: 'markdown_version',
            tags: 'tags',
            lastEdited: 'last_edited',
        };

        for (const [jsKey, dbCol] of Object.entries(mapping)) {
            if (data[jsKey] !== undefined) {
                row[dbCol] = data[jsKey];
            }
        }
        return row;
    }

    static _format(row) {
        if (!row) return null;
        const note = new Note();
        note.id = row.id;
        note._id = row.id;
        note.sessionId = row.session_id;
        note.userId = row.user_id;
        note.title = row.title;
        note.content = row.content || {};
        note.markdownVersion = row.markdown_version || '';
        note.tags = row.tags || [];
        note.lastEdited = row.last_edited;
        note.createdAt = row.created_at;
        note.updatedAt = row.updated_at;
        return note;
    }
}

module.exports = Note;
