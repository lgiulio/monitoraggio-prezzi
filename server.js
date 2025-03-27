const db = require("./db");
require('dotenv').config();
const express = require('express');
const mysql = require("mysql2/promise");
const cors = require('cors');
const bcrypt = require('bcryptjs'); // 🔒 Per criptare le password
const jwt = require('jsonwebtoken'); // 🔑 Per generare i token di autenticazione
const puppeteer = require('puppeteer'); // 🖥️ Per lo scraping dei prezzi
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = "supersegreto"; // 🔥 Cambia questa chiave con una più sicura
const { cripta } = require("./utils/crypto");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 📌 Blacklist per token disabilitati (Logout)
const blacklist = new Set();

// 📌 Connessione a MySQL




// Middleware per rendere `db` disponibile in tutte le richieste API
app.use(async (req, res, next) => {
    if (!db) {
        console.error("❌ ERRORE - Il database non è ancora connesso!");
        return res.status(500).json({ error: "Database non disponibile" });
    }
    req.db = db;
    next();
});

// Esporta la connessione per usarla in altri file
module.exports = db;

// 📌 Middleware per proteggere le rotte con JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    console.log("🔍 DEBUG - Header Authorization ricevuto:", authHeader); // 🔥 Aggiunto per debug

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("❌ DEBUG - Token mancante o malformato!");
        return res.status(403).json({ error: "Accesso negato, token mancante o malformato" });
    }

    const token = authHeader.split(" ")[1]; // 🔥 Estrae il token esatto
    console.log("🔍 DEBUG - Token estratto:", token);

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log("❌ DEBUG - Token non valido:", err.message);
            return res.status(401).json({ error: "Sessione scaduta. Effettua di nuovo il login." });
        }

        console.log("✅ DEBUG - Token verificato per:", decoded);
        req.user = decoded;
        next();
    });
};

// 📌 Registrazione utente
app.post("/api/register", async (req, res) => {
    const { nome, email, password } = req.body;

    console.log("🟢 DEBUG - Richiesta di registrazione ricevuta");
    console.log("🔹 Nome:", nome);
    console.log("🔹 Email:", email);
    console.log("🔹 Password: (non stampata per sicurezza)");

    if (!nome || !email || !password) {
        console.warn("⚠️ ERRORE - Campi mancanti nella registrazione!");
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    try {
        // ✅ Verifica se l'email esiste già
        const [existingUser] = await req.db.query("SELECT * FROM utenti WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            console.warn("⚠️ ERRORE - Email già registrata!");
            return res.status(400).json({ error: "Email già registrata" });
        }

        // ✅ Criptiamo la password con bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("🔐 DEBUG - Password criptata con successo");

        // ✅ Inseriamo l'utente nel database
        const query = "INSERT INTO utenti (nome, email, password_hash) VALUES (?, ?, ?)";
        const [result] = await req.db.query(query, [nome, email, hashedPassword]);

        console.log("✅ DEBUG - Utente registrato con successo! ID:", result.insertId);
        res.status(201).json({ message: "Registrazione completata con successo!" });

    } catch (err) {
        console.error("❌ ERRORE nella registrazione:", err);
        res.status(500).json({ error: "Errore nella registrazione dell'utente" });
    }
});




// 📌 Login utente
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    try {
        // ✅ Controlliamo che la connessione al DB sia pronta
        if (!req.db) {
            console.error("❌ ERRORE - Database non disponibile durante il login!");
            return res.status(500).json({ error: "Database non disponibile" });
        }

        console.log("🟢 DEBUG - Richiesta login ricevuta");
        console.log("🔹 Email ricevuta:", email);
        console.log("🔍 Controllando il database...");

        // ✅ Query con Promises usando `await req.db.query()`
        const [results] = await req.db.query("SELECT * FROM utenti WHERE email = ?", [email]);

        if (results.length === 0) {
            console.warn("⚠️ DEBUG - Email non trovata nel database.");
            return res.status(400).json({ error: "Email non registrata" });
        }

        const user = results[0];

        // ✅ Verifica password con `bcrypt.compare`
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.warn("⚠️ DEBUG - Password errata per l'email:", email);
            return res.status(401).json({ error: "Password errata" });
        }

        // ✅ Generazione token JWT
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

        console.log("✅ DEBUG - Login effettuato con successo per:", email);
        res.json({ message: "Login effettuato!", token });

    } catch (err) {
        console.error("❌ ERRORE nel login:", err);
        res.status(500).json({ error: "Errore nel database durante il login" });
    }
});



// 📌 Logout utente
app.post('/api/logout', verifyToken, (req, res) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ error: "Token mancante o malformato" });
    }

    const token = authHeader.split(" ")[1]; // 🔥 Estrai il token JWT
    blacklist.add(token); // 🔥 Aggiunge il token alla blacklist

    res.json({ message: "Logout effettuato con successo!" });
});


//ENDPOINT PER RECUPERARE LE NOTIFICHE

app.get("/api/notifiche/:categoria_id", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const categoriaId = req.params.categoria_id;

    try {
        // 🔍 Recupera la notifica per l'utente e la categoria
        const [[notifica]] = await db.query(
            `SELECT nomi, orario, frequenza
             FROM notifiche
             WHERE user_id = ? AND categoria_id = ?`,
            [userId, categoriaId]
        );

        // 🔍 Recupera le info dell’utente (mittente, password, email di notifica)
        const [[utente]] = await db.query(
            `SELECT email_notifica, email_mittente, password_app_criptata
             FROM utenti
             WHERE id = ?`,
            [userId]
        );

        if (!notifica) {
            return res.status(404).json({ message: "Nessuna notifica trovata per questa categoria" });
        }

        res.json({
            nomi: JSON.parse(notifica.nomi),
            orario: notifica.orario,
            frequenza: notifica.frequenza,
            email_notifica: utente?.email_notifica || "",
            email_mittente: utente?.email_mittente || "",
            password_app: utente?.password_app_criptata || ""
        });

    } catch (error) {
        console.error("❌ Errore nel caricamento notifica:", error);
        res.status(500).json({ error: "Errore nel caricamento della notifica" });
    }
});



app.post("/api/notifiche", verifyToken, async (req, res) => {
    const userId = req.user.id;

    // ✅ Estrai anche categoria_id
    const {
        categoria_id,
        nomi,
        orario,
        frequenza,
        emailNotifica,
        emailMittente,
        passwordApp
    } = req.body;

    // ✅ Controllo dei dati
    if (
        !categoria_id ||
        !nomi || !Array.isArray(nomi) ||
        !orario || !frequenza ||
        !emailNotifica || emailNotifica.trim() === "" ||
        !emailMittente || emailMittente.trim() === "" ||
        !passwordApp || passwordApp.trim() === ""
    ) {
        return res.status(400).json({ error: "Dati incompleti" });
    }

    try {
        const { cripta } = require("./utils/crypto");
        const passwordCriptata = cripta(passwordApp);

        // ✅ Salva i dati SMTP utente
        await db.query(
            `UPDATE utenti
             SET email_notifica = ?, email_mittente = ?, password_app_criptata = ?
             WHERE id = ?`,
            [emailNotifica, emailMittente, passwordCriptata, userId]
        );

        // ✅ Salva o aggiorna la notifica per categoria
        await db.query(
            `INSERT INTO notifiche (user_id, categoria_id, nomi, orario, frequenza)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               nomi = VALUES(nomi),
               orario = VALUES(orario),
               frequenza = VALUES(frequenza)`,
            [userId, categoria_id, JSON.stringify(nomi), orario, frequenza]
        );

        res.json({ success: true, message: "✅ Notifica salvata con successo" });
    } catch (error) {
        console.error("❌ Errore salvataggio notifica:", error);
        res.status(500).json({ error: "Errore nel salvataggio" });
    }
});

// ✅ API - Disattiva notifica (senza eliminare)
// ✅ API - Disattiva notifica (senza eliminarla)
app.post("/api/notifiche/disattiva", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { categoria_id } = req.body;

    if (!categoria_id) {
        return res.status(400).json({ error: "Categoria ID mancante" });
    }

    try {
        await db.query(
            `UPDATE notifiche
             SET frequenza = NULL, orario = NULL
             WHERE user_id = ? AND categoria_id = ?`,
            [userId, categoria_id]
        );

        res.json({ success: true, message: "🔕 Notifica disattivata con successo" });
    } catch (error) {
        console.error("❌ Errore disattivazione notifica:", error);
        res.status(500).json({ error: "Errore nella disattivazione della notifica" });
    }
});
// ✅ API - Elimina completamente la notifica per una categoria
app.delete("/api/notifiche/:categoria_id", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const categoriaId = req.params.categoria_id;

    if (!categoriaId) {
        return res.status(400).json({ error: "Categoria ID mancante" });
    }

    try {
        const [result] = await db.query(
            `DELETE FROM notifiche WHERE user_id = ? AND categoria_id = ?`,
            [userId, categoriaId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Nessuna notifica trovata da eliminare" });
        }

        res.json({ success: true, message: "🗑️ Notifica eliminata con successo" });
    } catch (error) {
        console.error("❌ Errore eliminazione notifica:", error);
        res.status(500).json({ error: "Errore nell'eliminazione della notifica" });
    }
});




app.post("/api/smtp-config", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { emailMittente, passwordApp } = req.body;

    if (!emailMittente || !passwordApp) {
        return res.status(400).json({ error: "Dati SMTP mancanti" });
    }

    const passwordCriptata = cripta(passwordApp);

    try {
        await db.query(
            "UPDATE utenti SET email_mittente = ?, password_app_criptata = ? WHERE id = ?",
            [emailMittente, passwordCriptata, userId]
        );

        res.json({ success: true, message: "📨 SMTP salvato con successo!" });
    } catch (err) {
        console.error("❌ Errore salvataggio SMTP:", err);
        res.status(500).json({ error: "Errore durante il salvataggio SMTP" });
    }
});

app.post("/api/check-nomi", async (req, res) => {
    const { userId, nomi } = req.body;

    if (!userId || !Array.isArray(nomi)) {
        return res.status(400).json({ error: "Dati non validi" });
    }

    try {
        const [prodotti] = await db.query(`
            SELECT * FROM prodotti
            WHERE user_id = ? AND nome_personalizzato IN (?)
        `, [userId, nomi]);

        // 🔁 Ora puoi eseguire lo scraping su questi prodotti come nel normale check
        // Puoi riusare il codice di scraping già esistente

        res.json({ success: true, prodotti: prodotti });
    } catch (error) {
        console.error("❌ Errore check-nomi:", error);
        res.status(500).json({ error: "Errore interno" });
    }
});

//API CATEGORIE///////////

// ✅ API - Ottieni tutte le categorie
app.get("/api/categorie", verifyToken, async (req, res) => {
    try {
        const [rows] = await req.db.query(
            "SELECT id, nome FROM categorie WHERE user_id = ? ORDER BY nome",
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error("❌ Errore GET categorie:", err);
        res.status(500).json({ errore: "Errore nel recupero delle categorie" });
    }
});


// ✅ API - Aggiungi nuova categoria
app.post("/api/categorie", verifyToken, async (req, res) => {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ errore: "Il campo 'nome' è obbligatorio" });

    try {
        const [result] = await req.db.query(
            "INSERT INTO categorie (nome, user_id) VALUES (?, ?)",
            [nome, req.user.id]
        );
        res.json({ id: result.insertId, nome });
    } catch (err) {
        console.error("❌ Errore POST categoria:", err);
        res.status(500).json({ errore: "Errore durante la creazione della categoria" });
    }
});


// ✅ API - Modifica categoria
app.put("/api/categorie/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ errore: "Il campo 'nome' è obbligatorio" });

    try {
        const [result] = await req.db.query(
            "UPDATE categorie SET nome = ? WHERE id = ? AND user_id = ?",
            [nome, id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ errore: "Categoria non trovata o accesso negato" });
        }
        res.json({ id, nome });
    } catch (err) {
        console.error("❌ Errore PUT categoria:", err);
        res.status(500).json({ errore: "Errore durante l'aggiornamento della categoria" });
    }
});

// ✅ API - Elimina categoria con controllo prodotti collegati
app.delete("/api/categorie/:id", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // 🔍 1. Controlla se ci sono prodotti collegati
        const [prodottiCollegati] = await req.db.query(
            "SELECT COUNT(*) AS totale FROM prodotti WHERE categoria_id = ? AND user_id = ?",
            [id, req.user.id]
        );

        if (prodottiCollegati[0].totale > 0) {
            return res.status(400).json({
                errore: "Ci sono prodotti collegati a questa categoria. Elimina prima i prodotti."
            });
        }

        // 🗑️ 2. Procedi con eliminazione della categoria
        const [result] = await req.db.query(
            "DELETE FROM categorie WHERE id = ? AND user_id = ?",
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ errore: "Categoria non trovata o accesso negato" });
        }

        res.json({ id });
    } catch (err) {
        console.error("❌ Errore DELETE categoria:", err);
        res.status(500).json({ errore: "Errore durante l'eliminazione della categoria" });
    }
});






// API per ottenere tutti i selettori
// API per ottenere tutti i selettori
// API per ottenere tutti i selettori
// API per ottenere tutti i selettori
app.get("/api/selettori", async (req, res) => {
    try {
        console.log("📡 API /api/selettori chiamata");  // ✅ Log per il debug
        const [selettori] = await req.db.query("SELECT * FROM selettori");
        console.log("📡 Selettori trovati:", selettori);  // ✅ Log per verificare se ci sono dati
        res.json(selettori);
    } catch (error) {
        console.error("❌ Errore nel recupero dei selettori:", error);
        res.status(500).json({ error: "Errore nel recupero dei selettori" });
    }
});



// API per aggiungere un nuovo selettore
app.post("/api/selettori", async (req, res) => {
    const { tipo, selettore } = req.body;
    if (!tipo || !selettore) {
        return res.status(400).json({ error: "Tipo e selettore sono obbligatori" });
    }

    try {
        await req.db.query("INSERT INTO selettori (tipo, selettore) VALUES (?, ?) ON DUPLICATE KEY UPDATE selettore = VALUES(selettore)", [tipo, selettore]);
        res.status(201).json({ message: "Selettore aggiunto con successo" });
    } catch (error) {
        console.error("❌ Errore nell'aggiunta del selettore:", error);
        res.status(500).json({ error: "Errore nell'aggiunta del selettore" });
    }
});

// API per modificare un selettore esistente
app.put("/api/selettori/:id", async (req, res) => {
    const { id } = req.params;
    const { tipo, selettore } = req.body;

    if (!tipo || !selettore) {
        return res.status(400).json({ error: "Tipo e selettore sono obbligatori" });
    }

    try {
        const [result] = await req.db.query(
            "UPDATE selettori SET tipo = ?, selettore = ? WHERE id = ?",
            [tipo, selettore, id]
        );

        if (result.affectedRows > 0) {
            res.json({ message: "Selettore aggiornato con successo" });
        } else {
            res.status(404).json({ error: "Selettore non trovato" });
        }
    } catch (error) {
        console.error("❌ Errore nella modifica del selettore:", error);
        res.status(500).json({ error: "Errore nella modifica del selettore" });
    }
});

// 📌 Endpoint per ottenere tutti i nomi personalizzati unici
app.get("/api/nomi-personalizzati", verifyToken, async (req, res) => {
    const { categoria_id } = req.query;

    try {
        if (!categoria_id) {
            return res.status(400).json({ error: "Parametro categoria_id mancante" });
        }

        const [rows] = await req.db.query(`
            SELECT DISTINCT nome_personalizzato
            FROM prodotti
            WHERE nome_personalizzato IS NOT NULL
              AND categoria_id = ?
              AND user_id = ?
            ORDER BY nome_personalizzato ASC
        `, [categoria_id, req.user.id]);

        res.json(rows.map(r => r.nome_personalizzato));
    } catch (error) {
        console.error("❌ Errore nel recupero dei nomi personalizzati:", error);
        res.status(500).json({ error: "Errore durante il recupero" });
    }
});





// API per eliminare un selettore
// ✅ API per eliminare un selettore
app.delete("/api/selettori/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await req.db.query("DELETE FROM selettori WHERE id = ?", [id]);

        if (result.affectedRows > 0) {
            res.json({ message: "Selettore eliminato con successo" });
        } else {
            res.status(404).json({ error: "Selettore non trovato" });
        }
    } catch (error) {
        console.error("❌ Errore nella rimozione del selettore:", error);
        res.status(500).json({ error: "Errore nella rimozione del selettore" });
    }
});

app.post('/api/prodotti', verifyToken, async (req, res) => {
    const { nome, nome_personalizzato, url, prezzo, categoria_id } = req.body;

    if (!nome || !url || !prezzo) {
        return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati!" });
    }

    try {
        const [result] = await req.db.query(
            "INSERT INTO prodotti (user_id, categoria_id, nome, nome_personalizzato, url, prezzo, ultima_verifica) VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [req.user.id, categoria_id || null, nome, nome_personalizzato || null, url, prezzo]
        );

        console.log(`✅ Prodotto aggiunto con ID: ${result.insertId}`);
        res.json({ message: "Prodotto aggiunto con successo!", id: result.insertId });
    } catch (error) {
        console.error("❌ Errore nel salvataggio del prodotto:", error);
        res.status(500).json({ error: "Errore nel salvataggio del prodotto." });
    }
});




// 📌 Endpoint per ottenere i prodotti salvati nel database
// 📌 Endpoint per ottenere i prodotti salvati nel database
app.get("/api/prodotti", async (req, res) => {
    const { categoria } = req.query;

    try {
        let query = `
            SELECT p.id, p.nome, p.nome_personalizzato, p.url, p.prezzo, p.ultima_verifica, p.categoria_id
            FROM prodotti p
        `;
        const params = [];

        if (categoria) {
            query += " WHERE p.categoria_id = ?";
            params.push(categoria);
        }

        const [prodotti] = await db.query(query, params);
        res.json(prodotti);

    } catch (error) {
        console.error("❌ Errore nel recupero prodotti:", error);
        res.status(500).json({ error: "Errore nel caricamento dei prodotti" });
    }
});

app.put("/api/prodotti/:id", verifyToken, async (req, res) => {

    const { id } = req.params;
    const { nome, nome_personalizzato, url, prezzo, categoria_id } = req.body;

    console.log(`🔎 DEBUG - ID ricevuto dal client: ${id}`);
    console.log("📡 DEBUG - Dati ricevuti dal frontend:", { nome, nome_personalizzato, url, prezzo, categoria_id });

    if (!id || !nome || !url || !prezzo) {
        console.error("❌ Errore: Dati mancanti.");
        return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
    }

    try {
        const [result] = await req.db.query(
            "UPDATE prodotti SET nome = ?, nome_personalizzato = ?, url = ?, prezzo = ?, categoria_id = ? WHERE id = ? AND user_id = ?",
            [nome, nome_personalizzato || null, url, prezzo, categoria_id || null, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            console.error("❌ Errore: Nessun prodotto aggiornato, ID non trovato.");
            return res.status(404).json({ error: "Prodotto non trovato." });
        }

        res.json({ success: true, message: "✅ Prodotto modificato con successo" });
    } catch (error) {
        console.error("❌ Errore nella modifica del prodotto:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});


// 📌 Endpoint per aggiornare un prodotto nel database
// 📌 Endpoint per eliminare un prodotto dal database
app.delete("/api/prodotti/:id", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const [prodotto] = await req.db.query(
            "SELECT * FROM prodotti WHERE id = ? AND user_id = ?",
            [id, req.user.id]
        );

        if (prodotto.length === 0) {
            return res.status(404).json({ error: "Prodotto non trovato o accesso negato" });
        }

        await req.db.query("DELETE FROM prodotti WHERE id = ?", [id]);
        res.json({ message: "Prodotto eliminato con successo" });

    } catch (error) {
        console.error("❌ Errore nella cancellazione:", error);
        res.status(500).json({ error: "Errore nella cancellazione" });
    }
});



function pulisciNomeEstratto(riga, nomeSalvato = "") {
    if (!riga) return null;

    // Se il nome salvato è contenuto nella riga (case insensitive)
    const index = riga.toLowerCase().indexOf(nomeSalvato.toLowerCase());

    if (index !== -1) {
        const nomeEstratto = riga.substr(index, nomeSalvato.length).trim();
        console.log(`🧼 Match diretto con nome salvato: "${nomeEstratto}"`);
        return nomeEstratto;
    }

    // Se non c'è match diretto, fallback ai metodi precedenti
    if (riga.toUpperCase().startsWith("SEI QUI:")) {
        console.log("🧼 Rimozione breadcrumb 'SEI QUI:'");
        riga = riga.replace(/^SEI QUI:\s*/i, "");
    }

    if (riga.includes(">") || riga.includes("|")) {
        const delimitatore = riga.includes(">") ? ">" : "|";
        const blacklist = ["home", "strumenti", "catalogo", "prodotti", "accessori", "ortodontici"];

        const parti = riga
            .split(delimitatore)
            .map(p => p.trim())
            .filter(p => p.length > 3 && !blacklist.includes(p.toLowerCase()));

        if (parti.length > 0) {
            riga = parti[parti.length - 1];
            console.log(`🧼 Pulizia breadcrumb → nome finale: "${riga}"`);
        } else {
            console.warn("⚠️ Tutti i segmenti scartati perché troppo generici.");
            return null;
        }
    }

    riga = riga.replace(/\s+/g, " ").trim();

    if (riga.length < 3 || /^(inizio|home|catalogo)$/i.test(riga)) {
        console.warn("⚠️ Nome troppo generico o corto, ignorato.");
        return null;
    }

    return riga;
}







const { chromium } = require('playwright');

app.post('/api/check-prodotto', verifyToken, async (req, res) => {
    const { prodotti } = req.body;
    if (!prodotti || prodotti.length === 0) {
        return res.status(400).json({ error: "Nessun prodotto selezionato." });
    }

    try {
        const browser = await chromium.launch({
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-http2',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

            const results = [];

            try {
                for (const prodotto of prodotti) {
                    const { id, url } = prodotto;
                    const page = await context.newPage();

                    try {
                        console.log(`🔍 Navigazione verso ${url}`);
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                       // GESTIONE NOME

                        // 🔹 Recupera il nome dal database
                        // 🔹 Recupera il nome dal database
                        // 🔹 Recupera il nome dal database
                        // 🔹 Recupera il nome dal database
                        // 🔹 Recupera il nome dal database
                        const [rows] = await req.db.query("SELECT nome FROM prodotti WHERE id = ?", [id]);
                        if (rows.length === 0) {
                            console.warn(`⚠️ Nessun prodotto con ID ${id} nel database.`);
                            results.push({ id, nome_prodotto_trovato: "N/A", prezzo_estratto: "N/A", confronto: "Prodotto non trovato nel database" });
                            continue;
                        }

                        let nomeSalvato = rows[0].nome.trim();
                        console.log(`📌 Nome nel database: "${nomeSalvato}"`);

                        const [prezzoRow] = await req.db.query("SELECT prezzo FROM prodotti WHERE id = ?", [id]);
                        const prezzoSalvato = prezzoRow.length > 0 ? prezzoRow[0].prezzo : "N/A";

                        console.log(`💾 Prezzo nel database: ${prezzoSalvato}`);

                        // 🔹 Step 1: Cerca nei selettori predefiniti
                        let nomeProdottoTrovato = null;
                        try {

                            // 🔹 Prova con una lista estesa di selettori predefiniti per il nome
                            const selettoriNomePredefiniti = [
                                ".product-title",
                                ".main-title",
                                ".item-name",
                                "h1.title", // ⬅️ AGGIUNTO QUESTO
                                ".product-name",
                                ".title-wrapper",
                                "h1.product-name"
                            ];

                            for (const selettore of selettoriNomePredefiniti) {
                                try {
                                    const nomeTrovato = await page.$eval(selettore, el => el.innerText.trim());
                                    const nomePulito = pulisciNomeEstratto(linea, nomeSalvato);


                                    if (nomePulito) {
                                        nomeProdottoTrovato = nomePulito;
                                        console.log(`✅ Nome trovato con selettore predefinito (${selettore}): "${nomeProdottoTrovato}"`);
                                        break;
                                    
                                    
                                    } else {
                                        console.warn(`⚠️ Nome non valido trovato con ${selettore}`);
                                    }

                                } catch {
                                    console.warn(`❌ Nessun elemento trovato con il selettore: ${selettore}`);
                                }
                            }


                            if (/\[Title\]|\[CodiceArticolo\]/i.test(nomeProdottoTrovato)) {
                                console.warn(`⚠️ Nome estratto non valido!`);
                                nomeProdottoTrovato = null;
                            } else {
                                console.log(`✅ Nome trovato con selettore diretto: "${nomeProdottoTrovato}"`);
                            }
                        } catch (error) {
                            console.warn(`⚠️ Nome non trovato con i selettori predefiniti.`);
                        }

                        // 🔹 Step 2: Cerca nei contenitori di prodotto
                        if (!nomeProdottoTrovato) {
                            console.warn(`⚠️ Cerco il nome nei contenitori di prodotto...`);
                            const prodottiHTML = await page.$$(".product-item, .product-box, .product-card");

                            for (const prodottoHTML of prodottiHTML) {
                                let nomeEstratto = await prodottoHTML.$eval(".product-title, .main-title, .item-name", el => el.innerText.trim()).catch(() => null);

                                if (nomeEstratto) {
                                    nomeEstratto = pulisciNomeEstratto(nomeEstratto);
                                    if (!nomeEstratto) continue;

                                    console.log(`🔍 Controllo nome: "${nomeEstratto}"`);

                                    if (nomeEstratto.toLowerCase() === nomeSalvato.toLowerCase()) {
                                        console.log(`✅ Nome trovato: "${nomeEstratto}"`);
                                        nomeProdottoTrovato = nomeEstratto;
                                        break;
                                    }
                                }

                            }
                        
                            }
                        

                        // 🔹 Step 3: Cerca nei selettori personalizzati dal database
                        if (!nomeProdottoTrovato) {
                            console.warn(`⚠️ Cerco il nome nei selettori personalizzati...`);

                            const [selettori] = await req.db.query("SELECT selettore FROM selettori WHERE tipo = 'nome'");

                            // 🔍 DEBUG: Mostra tutti i selettori letti dal DB
                            console.log("🧪 Selettori personalizzati per il nome:", selettori.map(s => s.selettore));

                            for (const selettore of selettori) {
                                try {
                                    console.log(`🔍 Provo selettore personalizzato: ${selettore.selettore}`);

                                    // 🔹 Aspetta che il selettore sia presente nel DOM
                                    await page.waitForSelector(selettore.selettore, { timeout: 1000 });

                                    //Pulizia del nome
                                    let nomeEstratto = await page.$eval(selettore.selettore, el => el.innerText.trim());

                                    if (nomeEstratto) {
                                        const nomePulito = pulisciNomeEstratto(linea, nomeSalvato);


                                        if (nomePulito) {
                                            nomeProdottoTrovato = nomePulito;
                                            console.log(`✅ Nome trovato con selettore personalizzato (${selettore.selettore}) e pulito: "${nomeProdottoTrovato}"`);
                                        } else {
                                            console.warn(`⚠️ Nome trovato con ${selettore.selettore} ma scartato dopo pulizia: "${nomeEstratto}"`);
                                            nomeProdottoTrovato = null;
                                            continue;
                                        }


                                        const nomeNormalizzatoDB = nomeSalvato.toLowerCase().replace(/\s+/g, " ").trim();
                                        const nomeNormalizzatoTrovato = nomeProdottoTrovato.toLowerCase().replace(/\s+/g, " ").trim();

                                        if (nomeNormalizzatoTrovato.includes(nomeNormalizzatoDB) || nomeNormalizzatoDB.includes(nomeNormalizzatoTrovato)) {
                                            console.log("✅ Il nome trovato è coerente con quello del database.");
                                            break;
                                        } else {
                                            console.warn("⚠️ Il nome trovato non è coerente col database, continuo a cercare...");
                                            nomeProdottoTrovato = null;
                                        }
                                    }



                                    nomeProdottoTrovato = pulisciNomeEstratto(nomeTrovato);
                                    console.log(`🧼 Nome pulito: "${nomeProdottoTrovato}"`);



                                        console.log(`✅ Nome trovato con selettore personalizzato (${selettore.selettore}): "${nomeProdottoTrovato}"`);

                                   

                                        // 🔹 Controlla se il nome trovato è abbastanza simile a quello salvato
                                        const nomeNormalizzatoDB = nomeSalvato.toLowerCase().replace(/\s+/g, " ").trim();
                                        const nomeNormalizzatoTrovato = nomeProdottoTrovato.toLowerCase().replace(/\s+/g, " ").trim();

                                        if (nomeNormalizzatoTrovato.includes(nomeNormalizzatoDB) || nomeNormalizzatoDB.includes(nomeNormalizzatoTrovato)) {
                                            console.log("✅ Il nome trovato è coerente con quello del database.");
                                            break;
                                        } else {
                                            console.warn("⚠️ Il nome trovato non è coerente col database, continuo a cercare...");
                                            nomeProdottoTrovato = null;
                                        }
                                    
                                } catch (error) {
                                    console.warn(`⚠️ Nome non trovato con il selettore personalizzato: ${selettore.selettore} → ${error.message}`);
                                }
                            }

                        }

                        // 🔹 Step 4: Fallback - Legge tutto il testo della pagina e cerca una corrispondenza
                        if (!nomeProdottoTrovato) {
                            console.warn(`⚠️ Cerco il nome leggendo tutta la pagina...`);

                            try {
                                let testoPagina = await page.evaluate(() => document.body.innerText);

                                let parole = testoPagina
                                    .split("\n")
                                    .map(p => p.trim())
                                    .filter(p => p.length > 5);

                                for (const linea of parole) {
                                    if (linea.toLowerCase().includes(nomeSalvato.toLowerCase())) {
                                        const nomePulito = pulisciNomeEstratto(linea, nomeSalvato);


                                        if (nomePulito) {
                                            nomeProdottoTrovato = nomePulito;
                                            console.log(`✅ Nome trovato leggendo la pagina e pulito: "${nomeProdottoTrovato}"`);
                                            break;
                                        } else {
                                            console.warn(`⚠️ Nome trovato ma scartato dopo pulizia: "${linea}"`);
                                        }
                                    }
                                }

                            } catch (error) {
                                console.warn(`❌ Errore durante la lettura della pagina: ${error.message}`);
                            }
                        }


                        // 🔹 Step 5: Se non abbiamo trovato nulla, assegniamo "N/A"
                        if (!nomeProdottoTrovato) {
                            console.error(`❌ Nome NON trovato con nessun metodo!`);
                            nomeProdottoTrovato = "N/A";
                        }

                        console.log(`✅ Nome finale assegnato: ${nomeProdottoTrovato}`);




                        //Legge la pagina per trovare il prezzo
                        let prezzoEstratto = null;
                        let selettoreUsato = null;

                        console.warn("🔍 Cerco nel testo visibile della pagina (solo con simbolo €)...");

                        try {
                            const possibiliPrezzi = await page.$$eval(
                                "*:not(script):not(style):not(noscript)",
                                elements =>
                                    elements
                                        .filter(el => {
                                            const style = window.getComputedStyle(el);
                                            return (
                                                el.offsetParent !== null && // visibile
                                                style.visibility !== "hidden" &&
                                                style.display !== "none"
                                            );
                                        })
                                        .map(el => el.innerText?.trim())
                                        .filter(txt => txt && /(€\s*\d{1,5}[.,]\d{2}|\d{1,5}[.,]\d{2}\s*€)/i.test(txt))

                            );

                            for (const testo of possibiliPrezzi) {
                                console.log("🔎 Verifica testo:", testo);
                                const match = testo.match(/€\s*(\d{1,5}(?:[.,]\d{2}))|(\d{1,5}(?:[.,]\d{2}))\s*€/i);
                                if (match && (match[1] || match[2])) {
                                    const valoreGrezzo = match[1] || match[2]; // Uno dei due sarà definito
                                    const pulito = valoreGrezzo.replace(/\./g, '').replace(",", ".");
                                    const valore = parseFloat(pulito);
                                    if (!isNaN(valore) && valore > 0) {
                                        prezzoEstratto = valore.toFixed(2);
                                        selettoreUsato = "Solo visibili con € (anche € davanti)";
                                        console.log(`✅ Prezzo trovato nel DOM: ${prezzoEstratto}`);
                                        break;
                                    }
                                }
                            }

                            
                        } catch (err) {
                            console.warn("⚠️ Errore nella ricerca nel DOM:", err.message);
                        }

                        if (!prezzoEstratto || prezzoEstratto === "N/A") {
                            console.error("❌ Prezzo non trovato!");
                        }
















                        // 🔹 Step 2: Se non trovato, prova con i selettori personalizzati
                        if (!prezzoEstratto) {
                            try {
                                console.log(`🔍 Cerco il prezzo nei selettori personalizzati dal database...`);

                                const [selettoriPersonalizzati] = await req.db.query("SELECT selettore FROM selettori WHERE tipo = 'prezzo'");
                                console.log(`🔎 Selettori personalizzati:`, selettoriPersonalizzati.map(s => s.selettore));

                                for (const { selettore } of selettoriPersonalizzati) {
                                    try {
                                        await page.waitForSelector(selettore, { timeout: 1000 }).catch(() => null);

                                        const prezzoHTML = await page.$(selettore);
                                        if (!prezzoHTML) continue;

                                        // ❌ Salta se il prezzo è barrato (line-through)
                                        const hasLineThrough = await page.evaluate(el => {
                                            const style = window.getComputedStyle(el);
                                            return style.textDecoration.includes("line-through");
                                        }, prezzoHTML).catch(() => false);

                                        if (hasLineThrough) {
                                            console.warn(`⛔️ Prezzo barrato ignorato per selettore: ${selettore}`);
                                            continue;
                                        }

                                        let prezzoTesto = await page.evaluate(el => el.innerText.trim(), prezzoHTML);
                                        console.log(`📄 Testo estratto da ${selettore.selettore}: "${prezzoTesto}"`);

                                        // ✅ Verifica simbolo € prima della pulizia
                                        const match = prezzoTesto.match(/(\d{1,3}(?:[.,]\d{1,2}))\s*(€|euro)/i);
                                        if (match && match[1]) {
                                            const prezzoPulito = match[1].replace(",", ".");
                                            if (!isNaN(parseFloat(prezzoPulito))) {
                                                prezzoEstratto = prezzoPulito;
                                                selettoreUsato = selettore;
                                                console.log(`✅ Prezzo valido trovato con simbolo €: ${prezzoEstratto}`);
                                                break;
                                            } else {
                                                console.warn(`⚠️ Prezzo estratto ma non valido: "${prezzoPulito}"`);
                                            }
                                        } else {
                                            console.warn(`⛔️ Nessun numero valido con simbolo € trovato in: "${prezzoTesto}"`);
                                        }

                                        // ✅ Normalizza caratteri strani
                                        prezzoTesto = prezzoTesto.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");

                                        // 🧼 Pulisci spazi doppi e simboli strani
                                        const testoPulito = prezzoTesto.replace(/\s+/g, " ").trim();

                                        // 🔍 Cerca solo numeri che contengono anche il simbolo €
                                        const matchPrezzo = testoPulito.match(/(€|euro)?\s*(\d{1,3}(?:[.,]\d{1,2}))/i);

                                        if (matchPrezzo && matchPrezzo[2]) {
                                            const prezzoPulito = matchPrezzo[2].replace(",", ".");
                                            if (!isNaN(parseFloat(prezzoPulito))) {
                                                prezzoEstratto = prezzoPulito;
                                                selettoreUsato = selettore;
                                                console.log(`✅ Prezzo trovato con selettore personalizzato (${selettore}): ${prezzoEstratto}`);
                                                break;
                                            } else {
                                                console.warn(`⚠️ Prezzo non valido dopo la pulizia: "${prezzoPulito}"`);
                                            }
                                        } else {
                                            console.warn(`⛔️ Nessun numero valido con simbolo € trovato in: "${testoPulito}"`);
                                        }

                                    } catch (err) {
                                        console.warn(`⚠️ Errore nel selettore personalizzato (${selettore}):`, err.message);
                                    }
                                }
                            } catch (e) {
                                console.error("❌ Errore nel recupero selettori personalizzati:", e.message);
                            }
                        }

                        // 🔹 Step 3: Ricostruzione da .base-price-int + .base-price-dec
                        if (!prezzoEstratto) {
                            console.log("🔧 Provo a ricostruire il prezzo da due parti: .base-price-int + .base-price-dec");

                            try {
                                const [parteIntera, parteDecimale] = await Promise.all([
                                    page.$eval(".base-price-int", el => el.innerText.trim()).catch(() => null),
                                    page.$eval(".base-price-dec", el => el.innerText.trim()).catch(() => null)
                                ]);

                                if (parteIntera && parteDecimale) {
                                    const combinato = `${parteIntera}.${parteDecimale}`.replace(",", ".");
                                    const numero = parseFloat(combinato);

                                    if (!isNaN(numero)) {
                                        prezzoEstratto = numero.toString();
                                        selettoreUsato = ".base-price-int + .base-price-dec";
                                        console.log(`✅ Prezzo ricostruito con doppio selettore: ${prezzoEstratto}`);
                                    } else {
                                        console.warn(`⚠️ Valore combinato non valido: ${combinato}`);
                                    }
                                } else {
                                    console.warn("⚠️ Uno dei due selettori non è stato trovato");
                                }
                            } catch (err) {
                                console.error("❌ Errore ricostruendo il prezzo da due elementi:", err.message);
                            }
                        }

                        // 🔚 Se ancora nulla, imposta a "N/A"
                        if (!prezzoEstratto) {
                            prezzoEstratto = "N/A";
                            selettoreUsato = "Nessun selettore valido";
                            console.error(`❌ Prezzo NON trovato!`);
                        }





                        console.log(`🔎 Nome: ${nomeProdottoTrovato}`);
                        console.log(`💰 Prezzo estratto dal sito: ${prezzoEstratto}`);
                        console.log(`💾 Prezzo nel database: ${prezzoSalvato}`);

                        // 🔹 Salviamo il risultato con i nomi giusti
                        results.push({
                            id,
                            nome_prodotto_trovato: nomeProdottoTrovato,
                            prezzo_database: prezzoSalvato,
                            nuovo_prezzo: prezzoEstratto,
                            selettore_usato: selettoreUsato,
                            confronto: nomeProdottoTrovato === nomeSalvato ? "✅ Nome corretto" : "⚠️ Nome diverso o non trovato"
                        });

                        console.log(`✅ Nome finale assegnato: ${nomeProdottoTrovato}`);
                        console.log(`💰 Prezzo finale assegnato: ${prezzoEstratto}`);

                    } catch (error) {
                        console.error(`❌ Errore nello scraping: ${error.message}`);
                    } finally {
                        await page.close();
                    }






                }
                console.log("📡 Dati inviati al frontend:", JSON.stringify(results, null, 2));
                console.log("📤 Invio dati al frontend:", results);  // ✅ DEBUG


                res.json({ risultati: results });

            } catch (error) {
                console.error("❌ Errore nel processo di scraping:", error);
            } finally {
                await browser.close();
            }









        } catch (error) {  // <-- Aggiunto blocco catch mancante
            console.error("❌ Errore nell'inizializzazione del browser:", error);
            res.status(500).json({ error: "Errore nell'inizializzazione del browser" });
        }
    });

const path = require("path");


// Servire i file statici dalla cartella "frontend"
app.use(express.static(path.join(__dirname, "frontend")));

require("./scheduler"); // 👈 questo avvia node-cron

// 📌 Avvio del server
app.listen(PORT, () => {
    console.log("📌 Endpoint registrati:");
    console.log("🔹 POST /api/register");
    console.log("🔹 POST /api/login");
    console.log("🔹 POST /api/logout");
    console.log("🔹 GET /api/prodotti");
    console.log("🔹 POST /api/check-prodotto");
    console.log("🔹 GET /api/selettori"); 
    console.log("🔹 POST /api/selettori"); 
    console.log("🔹 PUT /api/selettori:id"); 
    console.log("🔹 DELETE /api/selettori:id"); 
    console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
});