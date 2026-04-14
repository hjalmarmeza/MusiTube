const fetch = require('node-fetch');

// El Token vendrá de variables de entorno para seguridad.
// Localmente puedes usar un archivo .env
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = '7823163854';

async function sendNotification(message) {
    if (!TELEGRAM_TOKEN) {
        console.warn('⚠️ No se ha configurado TELEGRAM_TOKEN. Saltando notificación.');
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: `🎵 *MusiChris Studio*\n\n${message}`,
                parse_mode: 'Markdown'
            })
        });
        console.log('🔔 Notificación enviada a Telegram.');
    } catch (error) {
        console.error('❌ Error enviando a Telegram:', error);
    }
}

module.exports = { sendNotification };
