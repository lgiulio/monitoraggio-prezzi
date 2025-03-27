const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '31.11.39.196',
      user: 'Sql142369',
      password: '0f661e83',
      database: 'Sql142369_1',
      port: 3306
    });

    console.log("✅ Connessione riuscita!");
    const [rows] = await conn.query("SHOW TABLES");
    console.log("📦 Tabelle presenti:", rows);

    await conn.end();
  } catch (err) {
    console.error("❌ Errore di connessione:", err);
  }
})();
