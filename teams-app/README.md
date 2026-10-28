# Demo para Microsoft Teams

Este directorio contiene el paquete de una pestaña personal de Teams que carga la
instancia alojada en Render:

`https://sistema-qr-inventario.onrender.com/`

## Crear el paquete

Desde la raíz del proyecto, ejecuta:

```powershell
Compress-Archive -Path teams-app/manifest.json, teams-app/icon-color.png, teams-app/icon-outline.png -DestinationPath teams-app/SistemaQR-demo-teams.zip -Force
```

El ZIP debe contener los tres archivos en su raíz, no una carpeta contenedora.

## Instalar la demo

1. En Microsoft Teams, abre **Aplicaciones > Administrar tus aplicaciones > Cargar una aplicación personalizada**.
2. Elige **Cargar para mí o para mis equipos** y selecciona `SistemaQR-demo-teams.zip`.
3. Abre **Sistema QR (demo)** desde la barra lateral y valida inicio de sesión, consultas y cámara/escáner.

Si no aparece la opción de carga, el administrador del tenant debe habilitar la carga de aplicaciones personalizadas o publicar el ZIP en el catálogo de aplicaciones de la organización.

## Antes de probar

Despliega el cambio de encabezados incluido en este repositorio. Teams carga las
pestañas en un iframe; por ello el servidor debe permitir sus dominios mediante
`Content-Security-Policy: frame-ancestors` y no puede responder con
`X-Frame-Options: SAMEORIGIN`.

Esta demo mantiene el inicio de sesión propio de la aplicación. No implementa SSO
de Microsoft Entra; eso sería una siguiente fase independiente.
