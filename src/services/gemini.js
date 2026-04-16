const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function fetchGeminiWithRetry(prompt, maxRetries = 3) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
    };

    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            if (data.candidates && data.candidates[0]) {
                return data.candidates[0].content.parts[0].text;
            }
            
            if (data.error && (data.error.code === 503 || data.error.code === 429)) {
                console.warn(`🔄 Gemini ocupado (${data.error.code}). Re-intentando en ${2 * (i + 1)}s...`);
                await sleep(2000 * (i + 1));
                continue;
            }
            
            console.error('⚠️ Respuesta inesperada de Gemini:', JSON.stringify(data, null, 2));
            throw new Error('Gemini no devolvió candidatos válidos.');
        } catch (err) {
            lastError = err;
            if (i === maxRetries - 1) break;
            await sleep(2000 * (i + 1));
        }
    }
    throw lastError || new Error('Fallo persistente al contactar con Gemini');
}

/**
 * Genera una descripción inspiracional con versículo bíblico para YouTube.
 * Tono: Inspirador, feliz, animando, salvación. NUNCA triste ni desolador.
 * @param {string} trackTitle - Título de la canción.
 * @param {string} albumName - Nombre del álbum.
 * @returns {Promise<string>} - Descripción generada.
 */
async function generateDescription(trackTitle, albumName) {
    if (!GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY no configurada. Usando descripción por defecto.');
        return `🎵 "${trackTitle}" del álbum "${albumName}"\n\n¡Que esta música llene tu corazón de esperanza y alegría en el Señor! 🙏✨\n\n#MusiChris #MúsicaCristiana #Fe #Esperanza`;
    }

    const prompt = `Eres un escritor cristiano inspiracional. 
Para la canción titulada "${trackTitle}" del álbum "${albumName}", escribe UNA descripción para YouTube que incluya:
1. Un versículo bíblico relevante y poderoso (con referencia exacta: libro, capítulo y versículo).
2. Un breve comentario de 2-3 frases que conecte el versículo con la canción.
3. Un mensaje de cierre que anime al oyente, hable de salvación y esperanza.

REGLAS ESTRICTAS:
- El tono SIEMPRE debe ser: alegre, esperanzador, inspirador, que anime a la salvación.
- NUNCA incluyas temas de: soledad, tristeza, decepción, sufrimiento sin esperanza, negatividad.
- Máximo 600 caracteres en total.
- Termina con 3 hashtags relevantes como: #MúsicaCristiana #Fe #Esperanza

Responde SOLO con la descripción, sin introducción ni explicación.`;

    try {
        const text = await fetchGeminiWithRetry(prompt);
        return text;
    } catch (err) {
        console.error('❌ Error generando descripción con Gemini:', err.message);
        return `🎵 "${trackTitle}" del álbum "${albumName}"\n\n"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13\n\n¡Que esta música sea una bendición para tu vida! 🙏 #MúsicaCristiana #Fe #Esperanza`;
    }
}

/**
 * Genera una lista de tags relevantes para YouTube.
 * @param {string} trackTitle - Título de la canción.
 * @param {string} albumName - Nombre del álbum.
 * @returns {Promise<string[]>} - Lista de tags.
 */
async function generateTags(trackTitle, albumName) {
    if (!GEMINI_API_KEY) {
        return ['Música Cristiana', 'Alabanza', 'Adoración', 'Fe', 'Esperanza', trackTitle, albumName];
    }

    const prompt = `Para una canción cristiana titulada "${trackTitle}" del álbum "${albumName}", genera exactamente 8 tags para YouTube. 
Responde SOLO con los tags separados por comas, sin numeración ni explicación.
Ejemplo: Música Cristiana, Alabanza, Fe, Esperanza, Adoración, Salvación, Gospel, Jesús`;

    try {
        const text = await fetchGeminiWithRetry(prompt);
        return text.split(',').map(t => t.trim()).slice(0, 10);
    } catch (err) {
        console.error('❌ Error generando tags:', err.message);
        return ['Música Cristiana', 'Alabanza', 'Adoración', 'Fe', 'Esperanza', trackTitle, albumName];
    }
}

module.exports = { generateDescription, generateTags };
