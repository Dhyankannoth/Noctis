const pool = require("./index.js");

pool.connect((err, client, release) => {
  if (err) {
    console.error("PostgreSQL connection error:", err.message);
  } else {
    console.log("PostgreSQL connected successfully");
    release();
  }
});

module.exports = pool;