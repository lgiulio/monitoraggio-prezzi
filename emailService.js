// emailService.js
async function inviaNotificaEmail(transporter, destinatario, oggetto, corpoMessaggio) {
    try {
        const info = await transporter.sendMail({
            from: transporter.options.auth.user, // usa il mittente corrente
            to: destinatario,
            subject: oggetto,
            html: corpoMessaggio
        });

        console.log("✅ Email inviata:", info.messageId);
    } catch (error) {
        console.error("❌ Errore invio email:", error);
    }
}

module.exports = inviaNotificaEmail;
