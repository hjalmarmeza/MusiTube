const fetch = require('node-fetch');

/**
 * Parser CSV robusto que maneja campos con comas dentro de comillas.
 * Resuelve el bug de campos como URLs con parámetros o nombres con comas.
 * @param {string} csvText - Texto CSV crudo.
 * @returns {Array} - Array de objetos de canciones.
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    return lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Último campo

        if (values.length < 4) return null;

        return {
            albumName:  values[0] || '',
            albumArt:   values[1] || '',
            trackTitle: values[2] || '',
            trackUrl:   values[3] || '',
            status:     values[4]?.trim() || 'Pending',
            youtubeId:  values[5]?.trim() || '',
            playlistId: values[6]?.trim() || ''
        };
    }).filter(song => song && song.trackTitle && song.trackTitle.length > 0);
}

// URL del Google Sheet publicado como CSV
const SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6JklsOia4HVvuB3b81unFfUWKv79KXUmBQq7JsIUqK6XZPgpTrgArqpSs80rWMN4SEwtVUuYGDMNs/pub?gid=1882591302&single=true&output=csv';

/**
 * Obtiene la lista de canciones desde el Google Sheet.
 * @returns {Promise<Array>} - Lista de objetos de canciones.
 */
async function getSongsFromSheet() {
    try {
        console.log('📡 Conectando con Google Sheets (CSV)...');
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const csvText = await response.text();
        
        const songs = parseCSV(csvText);
        console.log(`✅ Se encontraron ${songs.length} canciones en el Sheet.`);
        return songs;
    } catch (error) {
        console.error('❌ Error leyendo el Sheet:', error);
        throw error;
    }
}

module.exports = { getSongsFromSheet };
