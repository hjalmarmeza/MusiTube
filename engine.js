const { getSongsFromSheet } = require('./src/services/sheets');
const { prepareAssets } = require('./src/services/downloader');
const { renderHighFidelityVideo } = require('./src/services/video');
const { uploadToYouTube } = require('./src/services/youtube');
const { sendNotification } = require('./src/services/telegram');
const { sanitizeFilename } = require('./src/utils/helpers');
const path = require('path');
const fs = require('fs');

async function main() {
    console.log('🤖 --- MUSITUBE AUTOMATOR: PILOTO AUTOMÁTICO ---');

    try {
        // 1. Obtener canciones
        const songs = await getSongsFromSheet();
        
        // 2. Filtrar las siguientes 6 canciones pendientes (Escudo Anti-Duplicados)
        const pendingSongs = songs
            .filter(s => s.status === 'Pending' && !s.youtubeId)
            .slice(0, 6);

        if (pendingSongs.length === 0) {
            console.log('✅ No hay canciones pendientes por procesar. ¡Todo al día!');
            await sendNotification('✅ *MusiTube Automator*: Todo al día en el Sheet.');
            return;
        }

        console.log(`🎬 Iniciando lote de procesamiento: ${pendingSongs.length} videos...`);

        for (const nextSong of pendingSongs) {
            try {
                console.log(`\n--- PROCESANDO: "${nextSong.trackTitle}" ---`);
                
                // (Opcional) Aquí enviarías un ping al Apps Script para marcar como 'Processing'
                
                // 3. Preparar Assets
        const { image, audio } = await prepareAssets(nextSong);

        // 4. Renderizar Video
        const safeName = sanitizeFilename(nextSong.trackTitle);
        const outputPath = path.join(__dirname, `assets/temp/${safeName}.mp4`);
        await renderHighFidelityVideo(image, audio, outputPath);

        // 5. Subir a YouTube
        const youtubeId = await uploadToYouTube(outputPath, nextSong);

                // 6. Notificar
                await sendNotification(`🚀 *¡Nueva subida! *\n\n🎵 Canción: ${nextSong.trackTitle}\n💿 Álbum: ${nextSong.albumName}\n🔗 ID YouTube: ${youtubeId}`);

                // Limpieza de archivos temporales
                if (fs.existsSync(image)) fs.unlinkSync(image);
                if (fs.existsSync(audio)) fs.unlinkSync(audio);
                
                console.log(`✨ Completado con éxito: ${nextSong.trackTitle}`);
            } catch (err) {
                console.error(`💥 Error procesando ${nextSong.trackTitle}:`, err);
                await sendNotification(`❌ Error en canción: ${nextSong.trackTitle}\n${err.message}`);
            }
        }

        console.log('\n🏁 --- LOTE FINALIZADO ---');

    } catch (error) {
        console.error('💥 Error en el ciclo de hoy:', error);
        await sendNotification(`❌ *Fallo en el Piloto Automático*\nError: ${error.message}`);
    }
}

main();
