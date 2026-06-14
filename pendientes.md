
1. 🎬 [P0] Reproducir contenido en streaming

Lo que tenemos: Transcodificación automática a calidades adaptativas (480p, 720p, 1080p) vía HLS en el backend, firmas de CloudFront seguras y reproductor en el frontend funcional.
Lo que falta:
Calidad 4K: No está configurada en la especificación del trabajo de MediaConvert (triggerTranscode.ts), por lo que no se genera esa calidad.
Límites por Plan de Usuario: El firmado de URLs no valida en base al "Plan" del usuario (ej. básico vs. premium) para limitar la calidad máxima que puede consumir.

2. 📋 [P0] Continuar viendo y gestionar "Mi Lista"
Lo que tenemos: Las tablas DynamoDB correspondientes y los endpoints del backend (history, lists) para actualizar progreso y gestionar favoritos.
Lo que falta en el Frontend:
Fila de "Continuar Viendo": No existe esta sección visual en la UI de inicio (Home.tsx). Las llamadas a la API para obtener el historial del perfil activo no están integradas en la interfaz.
Funcionalidad real de "Mi Lista": Actualmente, el carrusel de la página de inicio que dice "Mi Lista de Contenido" carga la lista completa de películas del catálogo global (allMovies), en lugar de hacer una petición para traer y mostrar la lista personalizada del usuario/perfil actual. Tampoco hay botones en la interfaz para "Añadir a mi lista" o "Remover de mi lista".

3. ⚙️ [P1] Administrar catálogo y contenido (Panel Admin)
Lo que tenemos: Endpoints de la API (POST, PUT, DELETE de /movies) protegidos con scopes y roles de Cognito (super_admin / content_admin).
Lo que falta en el Frontend:
Interfaz de Administración (Admin Panel): El frontend no tiene ninguna vista o pantalla para administradores que les permita agregar nuevas películas, editar metadatos o subir el archivo de video .mp4 para activar el trigger de transcodificación (actualmente todo esto se realiza de forma manual mediante peticiones directas de API/Postman y comandos S3 de AWS CLI).

4. 🧠 [P2] Recomendaciones personalizadas
Lo que tenemos: El endpoint /recommendations en el backend calcula las sugerencias basándose en el historial de reproducción de los perfiles.
Lo que falta en el Frontend:
Sección de Recomendaciones: El cliente del frontend no llama a esta API y, por lo tanto, no existe una fila o carrusel de "Recomendadas para ti" que varíe dinámicamente según el perfil seleccionado.

5. 👥 [P2] Perfiles múltiples por cuenta
Lo que tenemos: Pantalla de selección de perfiles en el frontend (profiles) y almacenamiento del perfil activo en el estado de la app.
Lo que falta:
Aunque el perfil se selecciona, como no están integradas las listas personales de "Mi Lista", "Historial" y "Recomendaciones" en las vistas del Home, la diferenciación real de preferencias entre los perfiles creados no es perceptible aún en la interfaz de usuario.