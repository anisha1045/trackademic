const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('syllabus.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      due_date TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER,
      task TEXT,
      FOREIGN KEY(assignment_id) REFERENCES assignments(id)
    )
  `);
});

function insertAssignment(title, due_date, tasks) {
  db.run(
    `INSERT INTO assignments (title, due_date) VALUES (?, ?)`,
    [title, due_date],
    function (err) {
      if (err) return console.error(err);
      const assignmentId = this.lastID;
      for (const task of tasks) {
        db.run(
          `INSERT INTO tasks (assignment_id, task) VALUES (?, ?)`,
          [assignmentId, task]
        );
      }
    }
  );
}

module.exports = { insertAssignment };
