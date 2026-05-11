const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');
const authCode = '4/0AeoWuM94pW9zLVlpWgZucug2_Bw5-ktH27F6E1Rxs37W3Fa9fnzogtXxIIoazbZcnnFLVg';

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

oAuth2Client.getToken(authCode, (err, token) => {
    if (err) {
        console.error('❌ Error intercambiando el código:', err);
        return;
    }
    console.log('\n✅ TOKEN GENERADO:');
    console.log(JSON.stringify(token));
    console.log('\n--- FIN ---');
});
