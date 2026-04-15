const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error('Gemini no devolvió candidatos.');
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
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
            const raw = data.candidates[0].content.parts[0].text;
            return raw.split(',').map(t => t.trim()).slice(0, 10);
        }
        throw new Error('Sin candidatos.');
    } catch (err) {
        console.error('❌ Error generando tags:', err.message);
        return ['Música Cristiana', 'Alabanza', 'Adoración', 'Fe', 'Esperanza', trackTitle, albumName];
    }
}

module.exports = { generateDescription, generateTags };
