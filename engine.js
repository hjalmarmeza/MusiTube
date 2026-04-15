const { getSongsFromSheet } = require('./src/services/sheets');
const { prepareAssets } = require('./src/services/downloader');
const { renderHighFidelityVideo } = require('./src/services/video');
const { uploadToYouTube } = require('./src/services/youtube');
const { sendNotification } = require('./src/services/telegram');
const { sanitizeFilename } = require('./src/utils/helpers');
const path = require('path');
const fs = require('fs');

async function main() {
    console.log('🤖 --- MUSICHRIS STUDIO: PILOTO AUTOMÁTICO v2.0 ---');
    
    const startTime = Date.now();
    const stats = { processed: 0, errors: 0, skipped: 0 };

    try {
        // 1. Obtener canciones y calcular estadísticas del Sheet
        const songs = await getSongsFromSheet();
        const pendingSongs = songs.filter(s => s.status === 'Pending' && !s.youtubeId).slice(0, 6);
        const doneSongs = songs.filter(s => s.status === 'Done' || s.youtubeId).length;
        stats.skipped = songs.length - pendingSongs.length - doneSongs;

        if (pendingSongs.length === 0) {
            const msg = `✅ *¡Todo al día!*\n\n📊 Total en Sheet: ${songs.length}\n✅ Subidos: ${doneSongs}\n⏳ Pendientes: 0\n\n¡El catálogo está completo por hoy! 🙌`;
            console.log('✅ No hay canciones pendientes por procesar.');
            await sendNotification(msg);
            return;
        }

        // 2. Aviso de inicio de lote
        console.log(`🎬 Iniciando lote: ${pendingSongs.length} videos...`);
        await sendNotification(`🚀 *Piloto Automático Iniciado*\n\n🎬 Procesando ${pendingSongs.length} canciones...\n📊 Ya subidas: ${doneSongs} de ${songs.length}`);

        // 3. Procesar cada canción
        for (const nextSong of pendingSongs) {
            try {
                console.log(`\n--- PROCESANDO: "${nextSong.trackTitle}" ---`);

                // Preparar Assets
                const { image, audio } = await prepareAssets(nextSong);

                // Renderizar Video
                const safeName = sanitizeFilename(nextSong.trackTitle);
                const outputPath = path.join(__dirname, `assets/temp/${safeName}.mp4`);
                await renderHighFidelityVideo(image, audio, outputPath);

                // Subir a YouTube (incluye descripción IA + tags + thumbnail)
                const { videoId, playlistId } = await uploadToYouTube(outputPath, nextSong);
                stats.processed++;

                // Notificar éxito individual
                await sendNotification(
                    `✅ *¡Nueva Canción Subida!*\n\n` +
                    `🎵 *${nextSong.trackTitle}*\n` +
                    `💿 Álbum: ${nextSong.albumName}\n` +
                    `🔗 [Ver en YouTube](https://youtube.com/watch?v=${videoId})\n` +
                    `📋 Playlist: [${nextSong.albumName}](https://youtube.com/playlist?list=${playlistId})`
                );

                // Actualizar el Sheet
                if (process.env.APPS_SCRIPT_URL) {
                    console.log(`📊 Actualizando Sheet para: ${nextSong.trackTitle}...`);
                    await fetch(process.env.APPS_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'update_status',
                            data: { trackTitle: nextSong.trackTitle, newStatus: 'Done', youtubeId: videoId, playlistId }
                        })
                    });
                }

                // Limpiar archivos temporales de esta iteración
                [image, audio, outputPath].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e){} });
                console.log(`✨ Completado: ${nextSong.trackTitle}`);

            } catch (err) {
                stats.errors++;
                console.error(`💥 Error procesando ${nextSong.trackTitle}:`, err);
                await sendNotification(`❌ *Error en:* ${nextSong.trackTitle}\n${err.message}`);
            }
        }

        // 4. REPORTE FINAL DEL DÍA
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        const remaining = songs.filter(s => s.status === 'Pending' && !s.youtubeId).length - stats.processed;
        
        const report = 
            `🏁 *Reporte del Lote Diario*\n\n` +
            `✅ Subidos hoy: *${stats.processed}*\n` +
            `❌ Errores: *${stats.errors}*\n` +
            `⏳ Pendientes restantes: *${Math.max(0, remaining)}*\n` +
            `✅ Total subidos: *${doneSongs + stats.processed}* de *${songs.length}*\n` +
            `⏱️ Duración del lote: *${elapsed} min*\n\n` +
            `${remaining > 0 ? '📅 Mañana a las 23:20 se procesarán más canciones.' : '🎉 ¡Catálogo completo!'}`;
        
        console.log('\n🏁 --- LOTE FINALIZADO ---');
        await sendNotification(report);

    } catch (error) {
        console.error('💥 Error en el ciclo de hoy:', error);
        await sendNotification(`❌ *Fallo en el Piloto Automático*\nError: ${error.message}`);
    }
}

main();
