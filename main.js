const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6JklsOia4HVvuB3b81unFfUWKv79KXUmBQq7JsIUqK6XZPgpTrgArqpSs80rWMN4SEwtVUuYGDMNs/pub?gid=1882591302&single=true&output=csv';

// URL de Google Apps Script (Puente MusiChris Studio)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_nQ5bfK8gPXHUXaHU6U9ThkAGV20nxzV89YouO5aQ6vfxBYjUKzqiinR_pQ-32ozY6w/exec'; 

let albumsData = {};

/**
 * 1. Cargar datos del Sheet con detección de estados
 */
async function loadLibrary() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        
        albumsData = {}; 

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

            if (status?.trim() === 'Done') albumsData[albumName].status = 'Done';
            if (status?.trim() === 'Processing') albumsData[albumName].status = 'Processing';
        });

        renderAlbums();
    } catch (error) {
        console.error("Error cargando el Sheet:", error);
    }
}

/**
 * 2. Renderizar Dashboard
 */
function renderAlbums() {
    const grid = document.getElementById('album-grid');
    grid.innerHTML = '';

    Object.values(albumsData).forEach(album => {
        const card = document.createElement('div');
        card.className = `album-card ${album.status.toLowerCase()}`;
        
        let statusBadge = '';
        let btnText = 'Subir a YouTube';
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
                <button class="auth-btn" ${btnDisabled} onclick="syncAlbum('${album.name}')">${btnText}</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * 3. Enviar orden de sincronización al Sheet
 */
async function syncAlbum(albumName) {
    const album = albumsData[albumName];
    
    const currentlyProcessing = Object.values(albumsData).find(a => a.status === 'Processing');
    if (currentlyProcessing) {
        alert(`⚠️ COLA OCUPADA: El álbum "${currentlyProcessing.name}" ya está procesándose. Espera a que termine.`);
        return;
    }

    if (!confirm(`¿Deseas poner el álbum "${albumName}" en la cola de subida?`)) return;

    try {
        // Enviar orden para cada track (marcar como Pending para que el engine lo agarre)
        for (const track of album.tracks) {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Apps Script requiere no-cors o redirección
                body: JSON.stringify({
                    action: 'update_status',
                    data: { trackTitle: track.title, newStatus: 'Pending' }
                })
            });
        }
        
        alert(`🚀 "${albumName}" puesto en cola exitosamente. En unos momentos el Autopilot lo detectará.`);
        loadLibrary();
    } catch (error) {
        console.error("Fallo al contactar con el puente:", error);
        alert("❌ Error al conectar con el Sheet. Revisa la consola.");
    }
}

window.onload = loadLibrary;
