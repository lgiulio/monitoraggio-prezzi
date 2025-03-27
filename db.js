const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "62.149.150.53",
    user: "Sql142369",
    password: "0f661e83",
    database: "Sql142369_1",
  port: 3306
});

module.exports = db;
