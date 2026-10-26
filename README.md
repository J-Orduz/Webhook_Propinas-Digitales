# Práctica Webhooks - Sistema de Propinas Digitales

## ¿Qué son los Webhooks?

Los **Webhooks** son mecanismos de comunicación asíncrona basados en el estilo *publish/subscribe* inverso, donde un emisor (proveedor) envía automáticamente una petición HTTP `POST` a una URL configurada por el receptor cuando ocurre un evento específico. A diferencia de un patrón de sondeo (*polling*), el receptor no tiene que preguntar constantemente si hay novedades, sino que es notificado en tiempo real cuando el evento sucede. 

Esta práctica es una guía para entender el funcionamiento de los **Webhooks**. Simula un sistema de propinas digitales dividido en dos servicios independientes que se comunican a través de internet público utilizando un túnel seguro de **Ngrok**.

## Requisitos previos

Antes de ejecutar esta práctica, se debe cumplir con lo siguiente:

- **Docker y Docker Compose:** La práctica corre completamente con contenedores, por lo que se requiere tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Docker Compose) instalado y en ejecución.
- **Cuenta en Ngrok:** Es necesario crear una cuenta gratuita en [ngrok.com](https://ngrok.com/) para obtener un `NGROK_AUTHTOKEN`. Esta llave debe colocarse en el archivo `.env` ubicado en la raíz del proyecto.
- **Puertos libres:** Asegúrate de tener libres los puertos `3000`, `4040`, `5050` y `5432` en su máquina local.

### Dependencias utilizadas y su función

| Dependencia | Uso | Explicación |
|-------------|-----|-------------|
| **Node.js** | Entorno de ejecución | Plataforma para ejecutar JavaScript del lado del servidor tanto en el emisor como en el receptor. |
| **Express** | Servidor HTTP (Receptor) | Framework minimalista para crear el endpoint `POST /webhooks/propinas` que recibe las peticiones HTTP. |
| **pg** | Cliente PostgreSQL (Receptor) | Permite conectar el servidor Express con la base de datos PostgreSQL para guardar las donaciones validadas. |
| **crypto (nativo de Node.js)** | Firma y verificación | Se utiliza para generar y validar la firma `HMAC-SHA256` con un secreto compartido, garantizando la autenticidad de cada webhook. |
| **fetch (nativo de Node.js 18+)** | Peticiones HTTP (Emisor) | Permite al emisor enviar la petición POST firmada al receptor a través de la URL pública de Ngrok. |
| **PostgreSQL** | Base de datos | Almacena de forma persistente las donaciones recibidas y validadas por el receptor. |
| **Ngrok** | Túnel seguro | Expone el servidor local del receptor a internet con una URL pública HTTPS, permitiendo recibir peticiones externas. |
| **Docker** | Contenedorización | Permite levantar todos los servicios (emisor, receptor, base de datos, Ngrok, pgAdmin) de forma aislada y reproducible. |

## Arquitectura del Proyecto

El sistema se compone de los siguientes elementos distribuidos en contenedores de Docker:
1. **Emisor (Simulador de Pasarela):** Script en Node.js que genera una donación aleatoria, la firma criptográficamente y la envía a internet.
2. **Ngrok (Túnel seguro):** Expone nuestro servidor local a internet y genera una URL pública dinámica (`https://...ngrok-free.dev`).
3. **Receptor (Nuestra App):** Servidor Express que recibe el webhook desde internet, valida la firma criptográfica para evitar fraudes y procesa la información.
4. **Base de Datos (PostgreSQL):** Almacena de forma persistente las donaciones validadas por el Receptor.

```text
 [ Docker: Emisor ] 
         |
         v (Petición HTTP POST Firmada)
 [ Internet Público (URL de Ngrok) ]
         |
         v (Redirección del Tráfico)
 [ Docker: Ngrok ] ---> [ Docker: Receptor (Express) ] ---> [ Docker: PostgreSQL ]
```

---

## Mecanismo de Seguridad: Verificación de Firma

Para evitar que atacantes descubran la URL del webhook y envíen donaciones falsas, se implementan **firmas criptográficas con un secreto compartido**:

1. El **Emisor** toma el texto plano del JSON (`bodyString`) y lo firma usando el algoritmo **HMAC-SHA256** junto con una clave secreta (`WEBHOOK_SECRET`). Envía el resultado en el encabezado HTTP `X-Signature`.
2. El **Receptor** recibe la petición, toma el JSON crudo y vuelve a calcular la firma usando su propia copia del `WEBHOOK_SECRET`.
3. Si ambas firmas coinciden, la petición se procesa y se guarda en la base de datos. Si no coinciden, se rechaza con un código `401 Unauthorized`.

---

## Instalación y Configuración

### 1. Clonar el repositorio y crear el archivo `.env`
Crea un archivo llamado `.env` en la **raíz del proyecto** (donde está el archivo `docker-compose.yml`) copiando la estructura de configuración:

```env
# Token obligatorio de Ngrok (Regístrese gratis en ngrok.com para obtener uno propio)
NGROK_AUTHTOKEN=tu_ngrok_authtoken_aqui
```

Hacer lo mismo para los archivos `.env` en las carpetas `emisor\` y `receptor\` siguiendo el `.env.example`.

### 2. Levantar la infraestructura completa
Ejecuta el siguiente comando en la terminal iniciar todos los servicios en segundo plano:

```bash
docker-compose up -d
```

---

## Cómo Probar la Demostración

Una vez que todos los contenedores muestren el estado `running`:

### Paso 1: Disparar el Webhook manualmente
Simule que un fan en internet acaba de enviar una propina ejecutando el script del emisor:

```bash
docker exec -it webhook_emisor node emisor.js
```

**Resultado esperado en la terminal del emisor:**
El emisor le consultará automáticamente a la API interna de Ngrok cuál es la URL pública asignada para este contenedor y enviará el paquete a través de internet:
```text
Enviando webhook a: https://ngrok-free.dev...
Webhook entregado con éxito. El receptor respondió HTTP 200 OK (ID: 1)
```

### Paso 2: Verificar la recepción en el Servidor
Abra otra terminal y revisa los logs de su servidor de aplicaciones para confirmar que la firma fue validada de forma segura:

```bash
docker logs webhook_receptor
```

**Resultado esperado en los logs del receptor:**
```text
[WEBHOOK VALIDADO Y PROCESADO]
De: GamerPro
Monto: $14.50 USD
Mensaje: "¡Excelente tutorial!"
ID de Transacción Guardado: 1
```

### Paso 3: Inspección visual en el Panel de Ngrok
Abra en su navegador la dirección [http://localhost:4040](http://localhost:4040). Tendrá acceso al panel de control de Ngrok en tiempo real donde podrá inspeccionar los encabezados HTTP recibidos, verificar la firma `X-Signature`, ver el cuerpo del JSON y analizar el tiempo exacto de respuesta de tu servidor backend.

---

## Integrantes y Funcionalidad Implementada

| Nombre Integrante | Código | Funcionalidad implementada (explica brevemente de qué se encargo) |
|-------------------|---------|-------------------------------------------------------------------|
| Juan David Orduz Sastoque | 20221020096 | **Emisor:** Encargado de generar las donaciones aleatorias, firmar el payload con HMAC-SHA256, obtener la URL pública de Ngrok y enviar el webhook al receptor. |
| Juan David Mayorga Vega | 20211020137 | **Receptor:** Encargado de crear el servidor Express, exponer el endpoint `/webhooks/propinas`, validar la firma criptográfica, procesar el JSON y almacenar las donaciones en PostgreSQL. |
| Esteban Alexander Bautista Solano | 20221020089 | **Integración, infra y documentación:** Encargado de la configuración con Docker Compose (emisor, receptor, Ngrok, PostgreSQL, pgAdmin), variables de entorno, túnel con Ngrok, README y documentación general del proyecto. |