# SMILE POS - Backend Firebase

Este proyecto es una aplicación de Punto de Venta (POS) moderna construida con React, Vite, Tailwind CSS y Firebase.

## Configuración Inicial

1. **Firebase**:
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
   - Habilita **Cloud Firestore** en el modo de prueba (o configura las reglas de seguridad).
   - Registra una aplicación web y obtén la configuración (API Key, etc.).
   - Pega tu configuración en el archivo `src/firebase.js`.

2. **Ejecución Local**:
   ```bash
   cd smilepos-app
   npm install
   npm run dev
   ```

3. **Poblar la base de datos**:
   - Una vez abierta la aplicación, si el Dashboard aparece vacío, verás un botón para **Inicializar Base de Datos**.
   - Haz clic en él para cargar el menú y las mesas iniciales en Firestore.

## Características
- **Sincronización en tiempo real**: Los cambios en las mesas y pedidos se reflejan instantáneamente en todos los dispositivos conectados.
- **Personalización de Burguer**: Soporte para variantes de carne, punto de cocción y extras.
- **Gestión de Sala**: Visualización clara del estado de las mesas (Libre, Ocupada, Pagando).
- **Control de Estadíos**: Seguimiento visual del progreso del pedido (Bebidas -> Entrantes -> Burgers -> Postres).
