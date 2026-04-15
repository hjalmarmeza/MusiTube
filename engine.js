/**
 * MusiChris Studio v3.0 "Majestic"
 * Motor principal de automatización — Pipeline completo
 */

require('dotenv').config();

const { getSongsFromSheet, updateSongStatus } = require('./src/services/sheets');
const { prepareAssets, cleanupTempFiles }      = require('./src/services/downloader');
const { uploadToYouTube, renderVideo }          = require('./src/services/youtube');
const { sendNotification }                      = require('./src/services/telegram');
const intelligence                              = require('./src/services/intelligence');
const path                                     = require('path');

const VERSION = '3.0.0 "Majestic"';
const BATCH_SIZE = 5; // Límite diario por cuota de YouTube

async function main() {
    console.log(`\n🚀 MusiChris Studio v${VERSION} Iniciando...`);
    const startTime = Date.now();
    let uploadedCount = 0;
    let errorCount = 0;

    try {
        const songs = await getSongsFromSheet();
        const pendingSongs = songs.filter(s => s.status === 'Pending').slice(0, BATCH_SIZE);

        if (pendingSongs.length === 0) {
            console.log('✅ No hay canciones pendientes para subir.');
            await sendNotification('✅ *Todo al día.* No hay canciones pendientes hoy.');
            return;
        }

        await sendNotification(`🎬 *MusiChris Studio v${VERSION}*\n\n🎵 Iniciando lote de *${pendingSongs.length}* canciones...`);

        for (const song of pendingSongs) {
            try {
                console.log(`\n--- PROCESANDO: "${song.trackTitle}" ---`);

                // 1. Descargar assets (imagen + audio)
                const { image, audio, tempPaths } = await prepareAssets(song);

                // 2. Renderizar video con diseño Majestic v7
                const outputVideo = path.join(__dirname, `assets/temp/video_${Date.now()}.mp4`);
                await renderVideo(image, audio, outputVideo, song.trackTitle);

                // 3. Subir a YouTube (incluye descripción IA + tags + thumbnail + playlist)
                const { videoId, playlistId } = await uploadToYouTube(outputVideo, song);

                // 4. Actualizar estado en el Sheet
                await updateSongStatus(song.key || song.trackTitle, 'Done');

                // 5. Notificar éxito individual
                await sendNotification(
                    `✅ *¡Subida Exitosa!*\n\n` +
                    `🎵 *${song.trackTitle}*\n` +
                    `💿 Álbum: ${song.albumName}\n` +
                    `🔗 [Ver en YouTube](https://youtube.com/watch?v=${videoId})\n` +
                    `📋 [Playlist del Álbum](https://youtube.com/playlist?list=${playlistId})`
                );

                uploadedCount++;

                // 6. Limpiar archivos temporales
                cleanupTempFiles([outputVideo, ...(tempPaths || [])]);

            } catch (err) {
                errorCount++;
                console.error(`💥 Error procesando "${song.trackTitle}":`, err.message);
                await sendNotification(`⚠️ *Error en:* "${song.trackTitle}"\n\`${err.message}\``);
            }
        }

        // --- FASE DE INTELIGENCIA (Después del lote) ---
        console.log('\n🧠 Ejecutando servicios de inteligencia...');
        let analyticsReport = '';
        let trendRadar      = '';
        let moderation      = '';

        try {
            // Analytics requiere objeto youtube autenticado — se reutiliza del primer upload
            // Para no volver a autenticar, extraemos las stats directamente via youtube.js
            analyticsReport = await intelligence.getDailyChannelStats();
        } catch (e) {
            console.warn('⚠️ Analytics no disponible:', e.message);
            analyticsReport = '📊 _Estadísticas no disponibles hoy._';
        }

        try {
            trendRadar = await intelligence.getTrendRadar();
        } catch (e) {
            console.warn('⚠️ Radar no disponible:', e.message);
        }

        try {
            moderation = await intelligence.moderateLatestComments();
        } catch (e) {
            console.warn('⚠️ Moderación no disponible:', e.message);
        }

        // --- REPORTE FINAL ---
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        const remaining = songs.filter(s => s.status === 'Pending').length - uploadedCount;

        const finalReport =
            `🏁 *Reporte del Lote Diario (v${VERSION})*\n` +
            `——————————————————\n` +
            `✅ Subidas hoy: *${uploadedCount}*\n` +
            `❌ Errores: *${errorCount}*\n` +
            `⏳ Pendientes restantes: *${Math.max(0, remaining)}*\n` +
            `⏱️ Duración: *${elapsed} min*\n\n` +
            `${analyticsReport}\n\n` +
            `${trendRadar}\n\n` +
            `${moderation}\n\n` +
            `${remaining > 0 ? '📅 Mañana a las 23:20 continuamos.' : '🎉 ¡Catálogo completo!'}`;

        await sendNotification(finalReport);
        console.log('\n🏁 --- LOTE FINALIZADO ---');

    } catch (error) {
        console.error('💥 ERROR CRÍTICO:', error.message);
        await sendNotification(`🚨 *ERROR CRÍTICO EN EL MOTOR*\n\`${error.message}\``);
    }
}

main();
