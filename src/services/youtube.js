const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Servicio Avanzado de YouTube v3 - Con Gestión Automática de Playlists
 */
async function uploadToYouTube(videoPath, songData) {
    console.log(`🚀 Preparando subida REAL a YouTube: ${songData.trackTitle}...`);
    
    // 1. Cargar Credenciales y Token
    let credentials;
    if (process.env.YOUTUBE_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.YOUTUBE_CREDENTIALS_JSON);
    } else if (fs.existsSync('credentials.json')) {
        credentials = JSON.parse(fs.readFileSync('credentials.json'));
    } else {
        console.warn('⚠️ No se encontraron credenciales. Simulación activa.');
        return 'SIMULATED_ID_' + Date.now();
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (!process.env.YOUTUBE_TOKEN_JSON && !fs.existsSync('token.json')) {
        throw new Error('❌ No se encontró token de acceso (YOUTUBE_TOKEN_JSON).');
    }
    const token = process.env.YOUTUBE_TOKEN_JSON ? JSON.parse(process.env.YOUTUBE_TOKEN_JSON) : JSON.parse(fs.readFileSync('token.json'));
    oAuth2Client.setCredentials(token);

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    try {
        // 2. BUSCAR O CREAR PLAYLIST PARA EL ÁLBUM
        const playlistId = await getOrCreatePlaylist(youtube, songData.albumName);
        console.log(`📂 Playlist para "${songData.albumName}" lista: ${playlistId}`);

        // 3. SUBIR EL VIDEO
        const videoRes = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: `${songData.trackTitle} - ${songData.albumName}`,
                    description: `Escucha "${songData.trackTitle}" del álbum "${songData.albumName}".\n\nAutomated by MusiTube.`,
                    categoryId: '10',
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false,
                },
            },
            media: { body: fs.createReadStream(videoPath) },
        });

        const videoId = videoRes.data.id;
        console.log(`✅ Video subido con éxito: ${videoId}`);

        // 4. AÑADIR VIDEO A LA PLAYLIST
        await youtube.playlistItems.insert({
            part: 'snippet',
            requestBody: {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: videoId
                    }
                }
            }
        });
        console.log(`➕ Video añadido a la playlist del álbum.`);

        return videoId;
    } catch (error) {
        console.error('❌ Error en YouTube:', error.message);
        throw error;
    }
}

/**
 * Busca una playlist por nombre o la crea si no existe
 */
async function getOrCreatePlaylist(youtube, albumName) {
    const playlistsRes = await youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 50
    });

    const existingPlaylist = playlistsRes.data.items.find(p => p.snippet.title === albumName);

    if (existingPlaylist) {
        return existingPlaylist.id;
    }

    // Crear nueva playlist si no existe
    const createRes = await youtube.playlists.insert({
        part: 'snippet,status',
        requestBody: {
            snippet: {
                title: albumName,
                description: `Álbum completo: ${albumName}`,
            },
            status: {
                privacyStatus: 'public'
            }
        }
    });

    return createRes.data.id;
}

module.exports = { uploadToYouTube };
