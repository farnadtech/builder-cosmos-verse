const sqlite3 = require("sqlite3").verbose();

// Open the database
const db = new sqlite3.Database("data/zemano.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    return;
  }
  console.log("Connected to SQLite database.");
});

// Query for the specific invite token
const inviteToken = "980191ea28df4ce1b1977a8333f3d15a";

db.get(
  `SELECT pi.*, p.title as project_title, p.id as project_id 
   FROM project_invites pi 
   LEFT JOIN projects p ON pi.project_id = p.id 
   WHERE pi.invite_token = ?`,
  [inviteToken],
  (err, row) => {
    if (err) {
      console.error("Error querying database:", err.message);
      return;
    }

    if (row) {
      console.log("✅ Invite found:");
      console.log("- Project ID:", row.project_id);
      console.log("- Project Title:", row.project_title);
      console.log("- Token:", row.invite_token);
      console.log("- Status:", row.status);
      console.log("- Created:", row.created_at);
      console.log("- Expires:", row.expires_at);
    } else {
      console.log("❌ No invite found for token:", inviteToken);
    }

    // Close the database
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      }
      console.log("Database connection closed.");
    });
  },
);
