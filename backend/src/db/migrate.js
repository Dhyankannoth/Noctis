const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function migrate() {
  const schemasDir = path.join(__dirname, "schemas");
  
  if (!fs.existsSync(schemasDir)) {
    console.warn("No database schemas directory found at", schemasDir);
    return;
  }

  const files = fs.readdirSync(schemasDir)
    .filter(file => file.endsWith(".sql"))
    .sort(); 

  console.log(`Found ${files.length} migration schema files to run.`);

  await pool.transaction(async (client) => {
    for (const file of files) {
      const filePath = path.join(schemasDir, file);
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(filePath, "utf8");
      
      try {
        await client.query(sql);
      } catch (err) {
        console.error(`Migration failed on file: ${file}`);
        throw err;
      }
    }
  });

  console.log("All database migrations completed successfully!");
}

module.exports = migrate;
