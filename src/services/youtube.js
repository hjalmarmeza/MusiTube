const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const { generateDescription, generateTags } = require('./gemini');

// Apunta FFmpeg al binario de Homebrew en macOS/Linux
if (process.platform === 'darwin') {
    ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
}

/**
 * Servicio Avanzado de YouTube v4 - Con Thumbnails, Tags IA y Descripción Inspiracional
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
        return { videoId: 'SIMULATED_ID_' + Date.now(), playlistId: 'SIMULATED_PLAYLIST_ID' };
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
        // 2. Generación IA: Descripción Inspiracional + Tags (en paralelo)
        console.log(`🤖 Generando descripción bíblica y tags con Gemini para: ${songData.trackTitle}...`);
        const [description, tags] = await Promise.all([
            generateDescription(songData.trackTitle, songData.albumName),
            generateTags(songData.trackTitle, songData.albumName)
        ]);
        console.log('✅ Descripción e tags generados con IA.');

        // 3. BUSCAR O CREAR PLAYLIST PARA EL ÁLBUM
        const playlistId = await getOrCreatePlaylist(youtube, songData.albumName);
        console.log(`📂 Playlist para "${songData.albumName}" lista: ${playlistId}`);

        // 4. SUBIR EL VIDEO
        const videoRes = await youtube.videos.insert({
            part: 'snippet,status',
            requestBody: {
                snippet: {
                    title: `${songData.trackTitle} - ${songData.albumName}`,
                    description: description,
                    categoryId: '10', // Música
                    tags: tags,
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

        // 5. SUBIR THUMBNAIL PERSONALIZADO (portada del álbum)
        if (songData.albumArt) {
            try {
                await uploadThumbnail(youtube, videoId, songData.albumArt);
                console.log(`🖼️ Thumbnail de álbum subido para: ${videoId}`);
            } catch (thumbErr) {
                console.warn(`⚠️ Thumbnail no subido (requiere canal verificado): ${thumbErr.message}`);
            }
        }

        // 6. AÑADIR VIDEO A LA PLAYLIST
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

        return { videoId, playlistId };
    } catch (error) {
        console.error('❌ Error en YouTube:', error.message);
        throw error;
    }
}

/**
 * Genera el video con el diseño "Majestic v7" (1600x900 central + Gold Waveform)
 */
async function renderVideo(imagePath, audioPath, outputPath, trackTitle) {
    return new Promise((resolve, reject) => {
        console.log(`🎬 Renderizando [Majestic v7]: ${trackTitle}...`);
        
        ffmpeg()
            .input(imagePath)
            .loop()
            .input(audioPath)
            // Filtro dinámico: Normalización de audio + Waveform Dorada + Composición Majestuosa
            .complexFilter([
                // 1. Normalizar Audio (Loudnorm) para volumen profesional uniforme
                {
                    filter: 'loudnorm',
                    inputs: '1:a',
                    outputs: 'anorm'
                },
                // 2. Fondo desenfocado (1920x1080)
                {
                    filter: 'scale',
                    options: '1920:1080',
                    inputs: '0:v',
                    outputs: 'bg_scaled'
                },
                {
                    filter: 'boxblur',
                    options: '20:10',
                    inputs: 'bg_scaled',
                    outputs: 'bg'
                },
                // 3. Pieza Hero Central (1600x900)
                {
                    filter: 'scale',
                    options: '1600:-1',
                    inputs: '0:v',
                    outputs: 'hero_pre'
                },
                {
                    filter: 'scale',
                    options: '1600:900',
                    inputs: 'hero_pre',
                    outputs: 'hero'
                },
                // 4. Visualizador de Frecuencia Dorado (showfreqs)
                {
                    filter: 'showfreqs',
                    options: {
                        s: '1600x250',
                        mode: 'bar',
                        colors: '0xD4AF37|0xFFD700',
                        fscale: 'log',
                        ascale: 'sqrt'
                    },
                    inputs: 'anorm',
                    outputs: 'freq'
                },
                // 5. Composición Final (Overlaying)
                {
                    filter: 'overlay',
                    options: { x: '(W-w)/2', y: '(H-h)/2' },
                    inputs: ['bg', 'hero'],
                    outputs: 'tmp'
                },
                {
                    filter: 'overlay',
                    options: { x: '(W-w)/2', y: 'H/2+250' },
                    inputs: ['tmp', 'freq'],
                    outputs: 'out'
                }
            ])
            .map('out')
            .map('anorm')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-preset medium',
                '-crf 18',
                '-shortest',
                '-pix_fmt yuv420p'
            ])
            .on('progress', (p) => {
                if (p.percent) console.log(`⏳ Progreso Render: ${Math.round(p.percent)}%`);
            })
            .on('error', (err) => {
                console.error('❌ Error en FFmpeg:', err.message);
                reject(err);
            })
            .on('end', () => {
                console.log('✅ Video Majestic Renderizado con éxito.');
                resolve(outputPath);
            })
            .save(outputPath);
    });
}

/**
 * Descarga la portada del álbum y la sube como thumbnail del video.
 */
async function uploadThumbnail(youtube, videoId, albumArtUrl) {
    const response = await fetch(albumArtUrl);
    const buffer = await response.buffer();
    
    await youtube.thumbnails.set({
        videoId: videoId,
        media: {
            mimeType: 'image/jpeg',
            body: require('stream').Readable.from(buffer)
        }
    });
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
                description: `Álbum completo: ${albumName} | MusiChris Studio`,
            },
            status: {
                privacyStatus: 'public'
            }
        }
    });

    return createRes.data.id;
}

module.exports = { uploadToYouTube, renderVideo, uploadThumbnail };
