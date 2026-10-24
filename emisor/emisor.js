const crypto = require('crypto');

const NGROK_API_URL = process.env.NGROK_API_URL;
const SECRET = process.env.WEBHOOK_SECRET;

const nombres = ['GamerPro', 'María_Dev', 'Anonimo404', 'CryptoFan', 'Carlos_Net'];
const mensajes = ['¡Excelente tutorial!', 'Gracias por la ayuda con Docker', 'Para el café', '¡Sigue así crack!', 'Un pequeño aporte de código'];

// Obtener dinámicamente la URL pública de internet que generó ngrok
async function obtenerUrlPublica() {
  try {
    const response = await fetch(NGROK_API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    // Validación crucial: Si Ngrok se está iniciando, el array 'tunnels' viene vacío []
    if (!data.tunnels || data.tunnels.length === 0) {
      throw new Error('Ngrok se está inicializando o no tiene túneles activos todavía. Espera unos segundos y reintenta.');
    }

    // Extrae la primera URL disponible (https) del túnel de ngrok
    const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
    if (!httpsTunnel) throw new Error('No se encontró un túnel HTTPS activo en ngrok.');
    
    return `${httpsTunnel.public_url}/webhooks/propinas`;
  } catch (error) {
    console.error('\n[ERROR DE CONEXIÓN CON NGROK]:', error.message);
    console.error('Asegúrate de haber puesto tu NGROK_AUTHTOKEN en el .env raíz y espera 5 segundos antes de disparar el comando.\n');
    process.exit(1);
  }
}


async function dispararWebhook() {
  // Obtener la URL pública dinámica
  const urlDestino = await obtenerUrlPublica();

  // Crear datos aleatorios de la donación
  const payload = {
    username: nombres[Math.floor(Math.random() * nombres.length)],
    amount: (Math.random() * (20 - 2) + 2).toFixed(2), // Monto aleatorio entre \$2 y \$20
    message: mensajes[Math.floor(Math.random() * mensajes.length)],
    timestamp: new Date().toISOString()
  };

  const bodyString = JSON.stringify(payload);

  // Firmar criptográficamente el cuerpo con el secreto usando HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(bodyString)
    .digest('hex');

  console.log(`Enviando webhook a: ${urlDestino}...`);

  // Realizar la petición HTTP POST utilizando el módulo nativo fetch de Node 18+
  fetch(urlDestino, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature // Enviamos la firma en los headers
    },
    body: bodyString
  })
    .then(async (res) => {
      if (res.status === 200) {
        const data = await res.json();
        console.log(`Webhook entregado con éxito. El receptor respondió HTTP 200 OK (ID: ${data.id})`);
      } else {
        console.error(`El receptor rechazó la petición con código: ${res.status}`);
      }
    })
    .catch((err) => {
      console.error('Error de red al intentar conectar con el receptor:', err.message);
    });
}


dispararWebhook();