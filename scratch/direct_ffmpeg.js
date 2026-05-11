const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function runDirectTest() {
    const image = '/Users/hjalmarmeza/Downloads/Antigravity/MusiChris-Studio/assets/temp/cover_1776293776004.png';
    const audio = '/Users/hjalmarmeza/Downloads/Antigravity/MusiChris-Studio/assets/temp/audio_1776293776004.mp3';
    const output = '/Users/hjalmarmeza/Downloads/Antigravity/MusiChris-Studio/test_final.mp4';
    const ffmpegPath = '/opt/homebrew/bin/ffmpeg';

    const cmd = `${ffmpegPath} -loop 1 -i "${image}" -i "${audio}" -filter_complex "[1:a]showwaves=s=1280x250:mode=cline:colors=white@0.8:r=25[wave];[0:v]scale=1280:720[bg];[bg][wave]overlay=x=0:y=450[out]" -map "[out]" -map 1:a -c:v libx264 -c:a aac -preset fast -crf 23 -shortest -y "${output}"`;

    console.log('🚀 Lanzando comando directo...');
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error('💥 ERROR:', error.message);
            console.error('📜 STDERR:', stderr);
            return;
        }
        console.log('✅ TRABAJO TERMINADO. Revisa: ' + output);
    });
}

runDirectTest();
