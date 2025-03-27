const cron = require("node-cron");
const db = require("./db");
const inviaEmail = require("./emailService.js");
const axios = require("axios");
const { decripta } = require("./utils/crypto");
const nodemailer = require("nodemailer");


// ⏰ Esegui ogni minuto per rispettare orario personalizzato utente
cron.schedule("* * * * *", async () => {
    console.log("⏰ Scheduler avviato - controllo notifiche...");

    try {
        const [notifiche] = await db.query("SELECT * FROM notifiche");

        const oraAdesso = new Date().toTimeString().slice(0, 5); // es. "08:00"

        for (const notifica of notifiche) {
            const orario = notifica.orario?.slice(0, 5); // es. da "23:52:00" → "23:52"
            const userId = notifica.user_id;
            const ultimaEsecuzione = notifica.ultima_esecuzione;
            const nomi = JSON.parse(notifica.nomi || "[]");

            // ⏸ Salta se orario attuale ≠ orario salvato
            if (orario !== oraAdesso) {
                console.log(`⏸ Notifica saltata per utente ${userId} - orario: ${orario}, adesso: ${oraAdesso}`);
                continue;
            }

            // ⏩ Controlla se già eseguito oggi
            const oggi = new Date().toISOString().split("T")[0];
            if (
                ultimaEsecuzione &&
                new Date(ultimaEsecuzione).toISOString().split("T")[0] === oggi
            ) {
                console.log(`⏩ Già eseguito oggi per utente ${userId}`);
                continue;
            }

            // 📩 Recupera dati utente: mittente, password criptata, destinatario
            const [[utente]] = await db.query(
                "SELECT email_mittente, password_app_criptata, email_notifica FROM utenti WHERE id = ?",
                [userId]
            );

            // ❌ Se manca qualcosa → salta
            if (!utente?.email_mittente || !utente?.password_app_criptata || !utente?.email_notifica) {
                console.log(`⚠️ Dati SMTP mancanti per utente ${userId}`);
                continue;
            }

            // 🔓 Decripta password
            let passApp;
            try {
                passApp = decripta(utente.password_app_criptata);
            } catch (err) {
                console.log(`❌ Errore decifrando password per utente ${userId}`);
                continue;
            }

            // 📦 Crea transporter dinamico
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: utente.email_mittente,
                    pass: passApp
                }
            });

            // 🔍 Cerca prodotti e prepara messaggio HTML
            let messaggio = `
                <h2>🛍️ Offerte del giorno - Monitoraggio Prezzi</h2>
                <p>Ciao! Ecco le migliori offerte trovate oggi per i tuoi gruppi selezionati:</p>
                <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
                    <thead style="background-color: #f2f2f2;">
                        <tr>
                            <th style="text-align: left;">📟 Nome Prodotto</th>
                            <th style="text-align: left;">🔗 URL</th>
                            <th style="text-align: left;">💶 Prezzo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const nome of nomi) {
                const [prodotti] = await db.query(
                    "SELECT nome, prezzo, url FROM prodotti WHERE nome_personalizzato = ?",
                    [nome]
                );

                if (prodotti.length === 0) continue;

                const prodottoMin = prodotti.reduce((min, p) =>
                    parseFloat(p.prezzo) < parseFloat(min.prezzo) ? p : min
                );

                messaggio += `
                    <tr>
                        <td>${prodottoMin.nome}</td>
                        <td><a href="${prodottoMin.url}" target="_blank">${prodottoMin.url}</a></td>
                        <td><strong>${prodottoMin.prezzo} €</strong></td>
                    </tr>
                `;
            }

            messaggio += `</tbody></table><p style="margin-top: 20px;">⏰ Prossimo controllo automatico domani.</p>`;

            // 📧 Invia email se ci sono prodotti
            if (messaggio.includes("<tr>")) {
                await inviaEmail(
                    transporter,
                    utente.email_notifica,
                    "📈 Offerte del giorno",
                    messaggio
                );

                console.log(`📬 Email inviata a ${utente.email_notifica}`);

                await db.query(
                    "UPDATE notifiche SET ultima_esecuzione = NOW() WHERE user_id = ?",
                    [userId]
                );
            } else {
                console.log(`📍 Nessun prodotto trovato per ${utente.email_notifica}`);
            }

        }
    } catch (err) {
        console.error("❌ Errore scheduler:", err);
    }
});
