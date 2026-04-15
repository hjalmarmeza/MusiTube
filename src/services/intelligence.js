/**
 * MusiChris Studio — Intelligence Service v1.0
 * Opciones 8 (Analytics), 10 (Moderación IA) y 14 (Radar de Tendencias)
 */

require('dotenv').config();

const { google }            = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs                    = require('fs');

class IntelligenceService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('⚠️ GEMINI_API_KEY no configurada. IntelligenceService en modo degradado.');
            return;
        }
        const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model   = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * Obtiene el cliente autenticado de YouTube (reutiliza token guardado)
     */
    _getYouTubeClient() {
        let credentials, token;
        if (process.env.YOUTUBE_CREDENTIALS_JSON) {
            credentials = JSON.parse(process.env.YOUTUBE_CREDENTIALS_JSON);
        } else if (fs.existsSync('credentials.json')) {
            credentials = JSON.parse(fs.readFileSync('credentials.json'));
        } else {
            throw new Error('No se encontraron credenciales de YouTube.');
        }

        if (process.env.YOUTUBE_TOKEN_JSON) {
            token = JSON.parse(process.env.YOUTUBE_TOKEN_JSON);
        } else if (fs.existsSync('token.json')) {
            token = JSON.parse(fs.readFileSync('token.json'));
        } else {
            throw new Error('No se encontró el token de YouTube.');
        }

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(token);
        return google.youtube({ version: 'v3', auth: oAuth2Client });
    }

    /**
     * OPCIÓN 8: Estadísticas diarias del canal (suscriptores, vistas, videos)
     */
    async getDailyChannelStats() {
        console.log('📊 Generando reporte de Analytics...');
        const youtube = this._getYouTubeClient();
        const res = await youtube.channels.list({ part: 'statistics', mine: true });

        if (!res.data.items || res.data.items.length === 0) {
            return '📊 _No se pudieron obtener estadísticas del canal._';
        }

        const stats = res.data.items[0].statistics;
        return (
            `📊 *Estadísticas del Canal*\n` +
            `——————————————————\n` +
            `👥 Suscriptores: *${Number(stats.subscriberCount).toLocaleString()}*\n` +
            `📽️ Total Videos: *${stats.videoCount}*\n` +
            `👁️ Vistas Totales: *${Number(stats.viewCount).toLocaleString()}*\n` +
            `_¡El canal sigue creciendo para la gloria de Dios! 🙌_`
        );
    }

    /**
     * OPCIÓN 10: Escanea los últimos comentarios y genera sugerencias de respuesta con IA
     */
    async moderateLatestComments() {
        if (!this.model) return '';
        console.log('💬 Escaneando comentarios para moderación...');

        const youtube = this._getYouTubeClient();
        const res = await youtube.commentThreads.list({
            part: 'snippet',
            allThreadsRelatedToChannelId: true,
            maxResults: 3
        });

        if (!res.data.items || res.data.items.length === 0) {
            return '💬 _No hay nuevos comentarios que revisar._';
        }

        let summary = '💬 *Sugerencias de Respuesta para Comentarios:*\n';

        for (const item of res.data.items) {
            const snippet    = item.snippet.topLevelComment.snippet;
            const commentText = snippet.textDisplay;
            const author     = snippet.authorDisplayName;

            const prompt = (
                `Eres el asistente del canal cristiano MusiChris Studio. ` +
                `Un oyente llamado "${author}" dejó este comentario: "${commentText}". ` +
                `Genera una respuesta breve (máx 2 frases), alegre, inspiradora y llena de fe. Solo la respuesta, sin comillas ni explicaciones.`
            );

            const result    = await this.model.generateContent(prompt);
            const aiReply   = result.response.text().trim();
            summary += `\n👤 *${author}:* _${commentText}_\n🤖 Sugerencia: ${aiReply}\n`;
        }

        return summary;
    }

    /**
     * OPCIÓN 14: Radar semanal de tendencias de música cristiana en español
     */
    async getTrendRadar() {
        if (!this.model) return '';
        console.log('🕵️ Activando Radar de Tendencias...');

        const prompt = (
            `Eres un experto en marketing de música cristiana en español. ` +
            `Analiza las tendencias actuales en YouTube sobre alabanza y adoración. ` +
            `Dame exactamente 3 temas, estilos o versículos que están resonando mucho esta semana. ` +
            `Formato: lista numerada, corta y motivadora.`
        );

        const result = await this.model.generateContent(prompt);
        return `🕵️ *Radar de Tendencias Semanales:*\n\n${result.response.text().trim()}`;
    }
}

module.exports = new IntelligenceService();
