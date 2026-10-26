CREATE TABLE IF NOT EXISTS donaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    mensaje TEXT,
    estado VARCHAR(50) DEFAULT 'procesado',
    creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);