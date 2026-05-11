const { getSongsFromSheet } = require('../src/services/sheets');
const { prepareAssets } = require('../src/services/downloader');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

if (process.platform === 'darwin') {
    ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
}

async function runTest() {
    console.log('🧪 INICIANDO PRUEBA REAL DE WAVEFORM...');
    
    try {
        const songs = await getSongsFromSheet();
        const nextSong = songs.find(s => s.status === 'Pending');
        
        if (!nextSong) throw new Error('No hay canciones pendientes en el Sheet.');
        
        console.log(`🎵 Usando: "${nextSong.trackTitle}"`);
        
        // Descargar assets
        const { image, audio } = await prepareAssets(nextSong);
        const outputPath = path.resolve(__dirname, '../test.mp4');
        
        console.log('🎬 Renderizando con Waveform Dinámica (Prototipo)...');

        // Comando FFmpeg avanzado:
        // 1. Toma la imagen y el audio.
        // 2. Crea la onda (showwaves) en tiempo real con fondo transparente.
        // 3. Superpone la onda sobre la imagen.
        ffmpeg()
            .input(image)
            .loop()
            .input(audio)
            .complexFilter([
                // Filtro para generar la onda de audio (estilo barras)
                {
                    filter: 'showwaves',
                    options: {
                        s: '1280x250',
                        mode: 'cline',
                        colors: 'white@0.8',
                        r: 25
                    },
                    inputs: '1:a',
                    outputs: 'wave'
                },
                // Superponer la onda sobre la imagen de fondo (escalada a 1280x720)
                {
                    filter: 'scale',
                    options: '1280:720',
                    inputs: '0:v',
                    outputs: 'bg'
                },
                {
                    filter: 'overlay',
                    options: {
                        x: 0,
                        y: 450 // Posición inferior
                    },
                    inputs: ['bg', 'wave'],
                    outputs: 'out'
                }
            ])
            .map('out')
            .map('1:a')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-preset ultrafast', // Rápido para la prueba
                '-crf 23',
                '-shortest',
                '-pix_fmt yuv420p'
            ])
            .on('start', (cmd) => console.log('🚀 Iniciando:', cmd))
            .on('progress', (p) => console.log(`⏳ Progreso: ${Math.round(p.percent)}%`))
            .on('error', (err) => console.error('❌ Error:', err.message))
            .on('end', () => console.log('✅ PRUEBA TOTALMENTE LISTA EN: ' + outputPath))
            .save(outputPath);

    } catch (err) {
        console.error('💥 Fallo en el test:', err.message);
    }
}

runTest();
