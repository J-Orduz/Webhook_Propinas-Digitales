const express = require('express');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.WEBHOOK_SECRET;

// Conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Obtener el body en formato texto crudo para verificar la firma de forma exacta
app.use(express.text({ type: 'application/json' }));

app.post('/webhooks/propinas', async (req, res) => {
  const signatureHeader = req.headers['x-signature'];
  const rawBody = req.body;

  if (!signatureHeader) {
    console.error('Petición rechazada: Falta el encabezado X-Signature');
    return res.status(401).send('Falta la firma de seguridad');
  }

  // Verificar la firma con el HMAC-SHA256 del cuerpo recibido usando el secreto
  const computedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(rawBody)
    .digest('hex');

  // Comparar de manera segura para evitar ataques de temporización
  let firmasCoinciden = false;
  try {
    firmasCoinciden = crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computedSignature));
  } catch (e) {
    firmasCoinciden = false;
  }
  if (!firmasCoinciden) {
    console.error('Petición fraudulenta: Las firmas criptográficas no coinciden');
    return res.status(401).send('Firma inválida. No autorizado.');
  }

  // Si es válida, se parsea el JSON y se opera
  try {
    const payload = JSON.parse(rawBody);
    const { username, amount, message } = payload;

    // Guardar en la Base de Datos
    const query = 'INSERT INTO donaciones (nombre, monto, mensaje) VALUES (\$1, \$2, \$3) RETURNING *';
    const values = [username, amount, message];
    const result = await pool.query(query, values);

    console.log(`\n[WEBHOOK VALIDADO Y PROCESADO]`);
    console.log(`De: ${username}`);
    console.log(`Monto: $${amount} USD`);
    console.log(`Mensaje: "${message}"`);
    console.log(`ID de Transacción Guardado: ${result.rows[0].id}\n`);

    return res.status(200).json({ received: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error al procesar el JSON o guardar en BD:', error.message);
    return res.status(500).send('Error interno del servidor');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Receptor escuchando en http://localhost:${PORT}`);
});