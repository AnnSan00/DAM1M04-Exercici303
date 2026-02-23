const mysql = require('mysql2');

class MySQL {
  constructor() {
    this.pool = null;
  }

  init(config) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  table_to_json(rows, types) {
    return rows.map(row => {
      const obj = {};
      for (const col in row) {
        if (types[col] === 'number') obj[col] = Number(row[col]);
        else obj[col] = row[col];
      }
      return obj;
    });
  }

  end() {
    return new Promise((resolve, reject) => {
      if (this.pool) {
        this.pool.end(err => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = MySQL;
