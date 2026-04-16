const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
    });
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function fetchFromSDKWithRetry(prompt, maxRetries = 4) {
    if (!model) throw new Error("API Key no configurada.");

    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text) return text;
            throw new Error("Respuesta vacía de la IA.");
        } catch (err) {
            lastError = err;
            console.warn(`[Gemini] Intento ${i + 1} fallido: ${err.message}. Reintentando en ${2 * (i + 1)}s...`);
            if (i === maxRetries - 1) break;
            await sleep(2000 * (i + 1));
        }
    }
    throw lastError || new Error("Fallo persistente reportado por el SDK.");
}

async function generateDescription(trackTitle, albumName) {
    if (!GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY no configurada. Usando descripción por defecto.');
        return fallbackDescription(trackTitle, albumName);
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
        return await fetchFromSDKWithRetry(prompt);
    } catch (err) {
        console.error('❌ Error generando descripción con SDK:', err.message);
        return fallbackDescription(trackTitle, albumName);
    }
}

async function generateTags(trackTitle, albumName) {
    if (!GEMINI_API_KEY) return fallbackTags(trackTitle, albumName);

    const prompt = `Para una canción cristiana titulada "${trackTitle}" del álbum "${albumName}", genera exactamente 8 tags para YouTube. 
Responde SOLO con los tags separados por comas, sin numeración ni explicación.
Ejemplo: Música Cristiana, Alabanza, Fe, Esperanza, Adoración, Salvación, Gospel, Jesús`;

    try {
        const text = await fetchFromSDKWithRetry(prompt);
        return text.split(',').map(t => t.trim()).slice(0, 10);
    } catch (err) {
        console.error('❌ Error generando tags con SDK:', err.message);
        return fallbackTags(trackTitle, albumName);
    }
}

function fallbackDescription(trackTitle, albumName) {
    return `🎵 "${trackTitle}" del álbum "${albumName}"\n\n"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13\n\n¡Que esta música sea una bendición para tu vida! 🙏 #MúsicaCristiana #Fe #Esperanza`;
}

function fallbackTags(trackTitle, albumName) {
    return ['Música Cristiana', 'Alabanza', 'Adoración', 'Fe', 'Esperanza', trackTitle, albumName];
}

module.exports = { generateDescription, generateTags };
