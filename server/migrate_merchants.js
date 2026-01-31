const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.run("ALTER TABLE merchants ADD COLUMN created_at TEXT DEFAULT '2024-01-01T00:00:00.000Z'", (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column already exists');
        } else {
            console.error('Error:', err.message);
        }
    } else {
        console.log('Column added successfully');
    }
});
