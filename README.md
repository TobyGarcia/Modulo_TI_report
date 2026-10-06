# 📱 Sistema de Inventario de Equipos y Mantenimientos con QR

Sistema web integral para la administración, control de inventario de equipos de cómputo, generación/escaneo de códigos QR, programación de mantenimientos preventivos/correctivos y firma digital de reportes de servicio.

---

## 🚀 Características Principales

- **Gestión de Inventario de Equipos**: Registro detallado de hardware, software, asignaciones y estado físico.
- **Generación y Escaneo de QR**: Generación de etiquetas con código QR por equipo y soporte para escaneo mediante cámara o lector de barras/QR.
- **Mantenimientos y Bitácora SGI**: Programación de mantenimientos (preventivos y correctivos), captura de firmas digitales (técnico y responsable), evidencias e historial.
- **Importación/Exportación**: Carga masiva de equipos mediante archivos Excel (`.xlsx`) y generación de reportes en PDF.
- **Autenticación y Roles**: Sistema de login basado en JWT (JSON Web Tokens) con roles de usuario.
- **Despliegue Contenedorizado**: Configuración completa con Docker y Docker Compose para levantar PostgreSQL, Backend, Frontend y Ngrok con un solo comando.

---

## 🛠️ Tecnologías Utilizadas

### **Frontend**
- **React 18** + **Vite**
- **Tailwind CSS** (Estilos y diseño responsivo)
- **Lucide React** (Iconografía)
- **qrcode.react** & **html2canvas** / **jsPDF** (Generación de QR y documentos PDF)

### **Backend**
- **Node.js** + **Express**
- **PostgreSQL** (`pg` driver)
- **JSONWebToken (JWT)** & **BcryptJS** (Seguridad y hashing de contraseñas)
- **Multer** & **XLSX** (Procesamiento de archivos y Excel)

### **Infraestructura**
- **Docker** & **Docker Compose**
- **Ngrok** (Opcional, para exposición segura mediante túneles HTTPS)

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Recomendado para la ejecución completa)
- *Opcional*: [Node.js v18+](https://nodejs.org/) y [PostgreSQL 16+](https://www.postgresql.org/) si deseas ejecutarlo sin Docker.

---

## ⚡ Inicio Rápido con Docker Compose

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITTORIO.git
   cd Sistema_QR
   ```

2. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Define valores únicos y seguros para `POSTGRES_PASSWORD` y `JWT_SECRET`. Para una base nueva, define también `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` (12 caracteres o más); ya no se crean usuarios con contraseñas conocidas. Configura `CORS_ORIGINS` con el dominio público autorizado.

3. **Iniciar los servicios:**
   ```bash
   docker-compose up -d --build
   ```

4. **Acceder a la aplicación:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)
   - **Ngrok Web UI (si está activo):** [http://localhost:4040](http://localhost:4040)

---

## 🔑 Cuenta inicial

En una instalación nueva no existen credenciales predeterminadas. El backend crea la primera cuenta administradora sólo si se proporcionan `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD` antes del primer arranque. Después, crea cuentas desde la administración de usuarios.

---

## 🌐 Despliegue en Render y Supabase

El proyecto está 100% preparado para ser desplegado en la nube utilizando **Render** (para la aplicación web) y **Supabase** (para la base de datos PostgreSQL).

### 1. Configuración de Base de Datos en Supabase
1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. Dirígete a **Project Settings > Database** y copia el **URI / Connection String** (Transaction Pooler en puerto `6543` o directo en `5432`).
3. No es necesario ejecutar código SQL manualmente; el backend inicializará y creará automáticamente las tablas y catálogos en Supabase durante el primer arranque.

### 2. Despliegue en Render
- **Opción Blueprint (`render.yaml`)**:
  1. Conecta tu repositorio de GitHub a [Render Dashboard](https://dashboard.render.com/).
  2. Selecciona **New + > Blueprint** y selecciona el repositorio. Render leerá automáticamente la configuración de `render.yaml`.
  3. Ingresa la variable `DATABASE_URL` (la URI de Supabase), `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD`.
  4. Haz clic en **Apply**. Render compilará el frontend y servirá la API y el cliente web en un único servicio web HTTPS.

- **Opción Web Service Manual**:
  1. Selecciona **New + > Web Service**.
  2. Configura:
     - **Build Command:** `npm run build`
     - **Start Command:** `npm start`
  3. En **Environment Variables**, establece `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_USERNAME` y `BOOTSTRAP_ADMIN_PASSWORD`.

---

## 📁 Estructura del Proyecto

```text
Sistema_QR/
├── backend/               # Servidor API REST (Express + Node.js)
│   ├── src/
│   │   ├── config/        # Configuración de base de datos PostgreSQL
│   │   ├── middleware/    # Middlewares de autenticación JWT
│   │   ├── routes/        # Rutas de usuarios, equipos y mantenimientos
│   │   └── services/      # Servicios de Excel y generación de QR
│   ├── Dockerfile
│   └── package.json
├── frontend/              # Aplicación Cliente (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Vistas y modales (Bitácora, Mantenimientos, QR, Formularios)
│   │   └── utils/         # Generadores de PDF y utilidades
│   ├── Dockerfile
│   └── package.json
├── db/                    # Scripts de base de datos
│   └── init.sql           # Esquema e inserción inicial de datos
├── docker-compose.yml     # Orquestación de contenedores
├── .env.example           # Plantilla de variables de entorno
├── .gitignore             # Archivos excluidos de Git
└── README.md              # Documentación del proyecto
```

---

## 🛡️ Seguridad

> **IMPORTANTE**: No subas `.env` con credenciales reales. En producción, `JWT_SECRET` es obligatorio y los orígenes permitidos se definen con `CORS_ORIGINS`. La consulta y calificación pública de tickets requiere además el código privado generado al registrar el ticket; el navegador lo conserva únicamente en el dispositivo que lo creó.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**.
