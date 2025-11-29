
# Guía de Conexión: Google Cloud Run + Base de Datos

Has desplegado el Frontend y el servidor Backend en Cloud Run. Para que los datos persistan, sigue estos pasos en la consola de Google Cloud.

## 1. Habilitar la Base de Datos (Firestore)
1. Ve a la consola de Google Cloud.
2. Busca **"Firestore"** en la barra superior.
3. Haz clic en **"Crear base de datos"**.
4. Selecciona el modo **"Nativo"** (Recomendado).
5. Elige la misma región que tu servicio de Cloud Run (ej. `us-west1`).
6. Haz clic en **Crear**.

## 2. Dar Permisos a Cloud Run
Tu aplicación (`confort-65-35`) tiene una "Cuenta de Servicio" (una identidad digital). Necesita permiso para escribir en la base de datos.

1. Ve a **Cloud Run** > Tu servicio (`confort-65-35`).
2. Ve a la pestaña **"Seguridad"**.
3. Mira cuál es la "Cuenta de servicio" (termina en `@developer.gserviceaccount.com`).
4. Ve a **IAM y Administración** en el menú principal.
5. Busca esa cuenta de servicio en la lista.
6. Haz clic en el lápiz (Editar) y añade el rol: **"Usuario de almacén de datos de Cloud"** (Cloud Datastore User) o **"Cliente de Firebase Admin"**.

## 3. Verificar Conexión
El nuevo código de `server.js` detectará automáticamente estas credenciales.
- Cuando despliegues de nuevo, verás en los logs: `[Backend] Conexión a Firestore: LISTA`.

## 4. (Opcional) Si usas Cloud SQL (PostgreSQL)
Si tu base de datos es SQL y no Firestore:
1. En Cloud Run > Editar e implementar nueva revisión.
2. Baja hasta **"Conexiones Cloud SQL"**.
3. Haz clic en "Añadir conexión" y selecciona tu instancia SQL.
4. Añade las variables de entorno en la pestaña Variables:
   - `DB_USER`
   - `DB_PASS`
   - `DB_NAME`
