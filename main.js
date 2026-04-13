const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6JklsOia4HVvuB3b81unFfUWKv79KXUmBQq7JsIUqK6XZPgpTrgArqpSs80rWMN4SEwtVUuYGDMNs/pub?gid=1882591302&single=true&output=csv';

// REEMPLAZAR con la URL que te dé Google Apps Script
const APPS_SCRIPT_URL = ''; 

let albumsData = {};

/**
 * 1. Cargar datos del Sheet con detección de estados
 */
async function loadLibrary() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        
        albumsData = {}; // Reiniciar

        rows.forEach((row, index) => {
            if (index === 0) return;
            
            const [albumName, albumArt, trackTitle, trackUrl, status, ytId] = row;
            if (!albumName) return;

            if (!albumsData[albumName]) {
                albumsData[albumName] = {
                    name: albumName,
                    art: albumArt,
                    status: status?.trim() || 'Pending',
                    ytId: ytId?.trim() || '',
                    tracks: []
                };
            }
            albumsData[albumName].tracks.push({
                title: trackTitle,
                status: status?.trim() || 'Pending'
            });

            // Si alguna canción del álbum está en proceso o terminada, afecta al álbum
            if (status?.trim() === 'Done') albumsData[albumName].status = 'Done';
            if (status?.trim() === 'Processing') albumsData[albumName].status = 'Processing';
        });

        renderAlbums();
    } catch (error) {
        console.error("Error cargando el Sheet:", error);
    }
}

/**
 * 2. Renderizar con Estética Premium y Colores de Estado
 */
function renderAlbums() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = '';

    Object.values(albumsData).forEach(album => {
        const card = document.createElement('div');
        card.className = `album-card ${album.status.toLowerCase()}`;
        
        let statusBadge = '';
        let btnText = 'Subir a YouTube';
        let btnClass = 'auth-btn';
        let btnDisabled = '';

        if (album.status === 'Done') {
            statusBadge = '<span class="badge done">✓ Subido</span>';
            btnText = 'Publicado';
            btnDisabled = 'disabled';
        } else if (album.status === 'Processing') {
            statusBadge = '<span class="badge processing">⏳ En Cola...</span>';
            btnText = 'Procesando';
            btnDisabled = 'disabled';
        }

        card.innerHTML = `
            <div class="status-container">
                <div class="track-count">${album.tracks.length} tracks</div>
                ${statusBadge}
            </div>
            <img src="${album.art}" class="album-art" alt="${album.name}">
            <div class="album-info">
                <h3>${album.name}</h3>
                <button class="${btnClass}" ${btnDisabled} onclick="syncAlbum('${album.name}')">${btnText}</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * 3. Lógica de Sincronización y Control de Colas
 */
async function syncAlbum(albumName) {
    const album = albumsData[albumName];
    
    // Verificación de cola
    const currentlyProcessing = Object.values(albumsData).find(a => a.status === 'Processing');
    
    if (currentlyProcessing) {
        alert(`⚠️ ATENCIÓN: El álbum "${currentlyProcessing.name}" ya está en cola.\n\n"${album.name}" se procesará automáticamente en el siguiente ciclo.`);
        return;
    }

    if (!APPS_SCRIPT_URL) {
        alert("🚀 ¡Modo Simulación! Para activación real, pega la URL de Apps Script en main.js");
        return;
    }

    // Aquí llamaríamos al Apps Script para cambiar el status en el Sheet
    console.log(`Cambiando estado a 'Processing' para el álbum: ${albumName}`);
    // fetch(APPS_SCRIPT_URL, { ... });
}

window.onload = loadLibrary;
