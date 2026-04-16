module.exports = async function handler(req, res) {
    // Solo permitir peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const githubToken = process.env.TOKEN_DE_GITHUB || process.env.GITHUB_TOKEN;

    if (!githubToken) {
        console.error("No se encontró el TOKEN_DE_GITHUB en las variables de entorno de Vercel.");
        return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
        // Ejecutar el workflow 'autopilot.yml' en el repo 'MusiChris-Studio'
        const response = await fetch('https://api.github.com/repos/hjalmarmeza/MusiChris-Studio/actions/workflows/autopilot.yml/dispatches', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${githubToken}`,
                'User-Agent': 'MusiChris-Vercel-Trigger'
            },
            body: JSON.stringify({
                ref: 'main' // Disparar a partir de la rama principal
            })
        });

        if (!response.ok) {
            const errorInfo = await response.text();
            console.error('Error al contactar con GitHub Actions:', errorInfo);
            return res.status(response.status).json({ message: 'No se pudo iniciar el workflow en GitHub' });
        }

        return res.status(200).json({ message: 'Autopilot iniciado con éxito' });
    } catch (error) {
        console.error('Error interno disparando el workflow:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
