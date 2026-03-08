var mysql = require('mysql2');

class Obj {
    init(parameters) {
        this.pool = mysql.createPool({
            connectionLimit: 10,
            host: parameters.host,
            port: parameters.port,
            user: parameters.user,
            password: parameters.password,
            database: parameters.database
        });

        this.pool.on('connection', (connection) => {
            connection.query(
                'SET SESSION group_concat_max_len = 1048576',
                () => {}
            );
        });

        console.log('MySQL connected with destination: ' + parameters.database);
    }

    end() {
        return this.pool.end();
    }

    // === NUEVO: query con parámetros, igual que el primer utils ===
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, params, (err, rst) => {
                if (err) reject(err);
                else resolve(rst);
            });
        });
    }

    // === Mantengo callbackQuery por compatibilidad con el profesor ===
    callbackQuery(queryStr, callback) {
        this.pool.query(queryStr, (err, rst) => callback(err, rst));
    }

    // === table_to_json del profesor, intacto ===
    table_to_json(rows, schema = {}) {
        const cast = (v, forcedType) => {
            if (v === null || v === undefined) return null;

            if (forcedType === 'string') return String(v);

            if (forcedType === 'number') {
                if (typeof v === 'number') return v;
                if (typeof v === 'string' && v.trim() === '') return null;
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            }

            if (forcedType === 'boolean') {
                if (typeof v === 'boolean') return v;
                if (typeof v === 'number') return v !== 0;
                const s = String(v).toLowerCase();
                if (s === 'true') return true;
                if (s === 'false') return false;
                const n = Number(s);
                return Number.isNaN(n) ? Boolean(v) : n !== 0;
            }

            if (forcedType === 'date') {
                if (v instanceof Date) return v.toISOString().slice(0, 10);
                return String(v);
            }

            if (forcedType === 'datetime') {
                if (v instanceof Date) return v.toISOString();
                return String(v);
            }

            if (forcedType === 'base64') {
                if (Buffer.isBuffer(v)) return v.toString('base64');
                return String(v);
            }

            if (Buffer.isBuffer(v)) return v.toString('base64');
            if (v instanceof Date) return v.toISOString();

            if (typeof v === 'bigint') {
                const n = Number(v);
                return Number.isSafeInteger(n) ? n : v.toString();
            }

            if (typeof v === 'number' || typeof v === 'boolean') return v;

            return v;
        };

        return rows.map((row) => {
            const obj = {};
            for (const [col, val] of Object.entries(row)) {
                obj[col] = cast(val, schema[col]);
            }
            return obj;
        });
    }
}

module.exports = Obj;
