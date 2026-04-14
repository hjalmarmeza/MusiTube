const { renderHighFidelityVideo } = require('../src/services/video');
const path = require('path');
const fs = require('fs');

async function runTest() {
    console.log('🚀 --- MUSICHRIS STUDIO: TEST DE RENDER DE ALTA FIDELIDAD ---');
    
    const assetsDir = path.join(__dirname, '../assets');
    const tempDir = path.join(__dirname, '../assets/temp');
    
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const imagePath = path.join(assetsDir, 'test_cover.png');
    const audioPath = path.join(assetsDir, 'test_audio.mp3');
    const outputPath = path.join(tempDir, 'test_video_result.mp4');

    // Verificar que existen los assets
    if (!fs.existsSync(imagePath) || !fs.existsSync(audioPath)) {
        console.error('❌ Error: No se encontraron los assets de prueba.');
        process.exit(1);
    }

    try {
        const result = await renderHighFidelityVideo(imagePath, audioPath, outputPath);
        console.log('\n✨ --- RESULTADO FINAL ---');
        console.log(`✅ Video generado exitosamente en: ${result}`);
        console.log('📂 Puedes abrir este archivo para verificar la calidad.');
    } catch (error) {
        console.error('\n💥 Fallo crítico en el renderizado:', error);
    }
}

runTest();
