const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = 'token.json';

// Cargar credenciales locales
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('❌ Error cargando credentials.json. Asegúrate de descargarlo de Google Cloud Console.');
  authorize(JSON.parse(content), (auth) => {
    console.log('✅ Autorización exitosa. Se ha creado token.json');
  });
});

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('🔗 Autoriza esta app visitando esta URL:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('📋 Pega el código de la página aquí: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('❌ Error recuperando el token de acceso', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('📦 Token almacenado en', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
