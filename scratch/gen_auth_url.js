const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ Error: No se encontró credentials.json en el directorio raíz.');
    process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    prompt: 'consent'
});

console.log('\n🔗 URL DE AUTORIZACIÓN:');
console.log(authUrl);
console.log('\n--- FIN DEL SCRIPT ---');
