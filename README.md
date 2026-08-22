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
   *(Modifica las variables en `.env` si necesitas cambiar puertos, contraseñas o tokens)*

3. **Iniciar los servicios:**
   ```bash
   docker-compose up -d --build
   ```

4. **Acceder a la aplicación:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)
   - **Ngrok Web UI (si está activo):** [http://localhost:4040](http://localhost:4040)

---

## 🔑 Credenciales por Defecto

Al inicializar la base de datos por primera vez (mediante `db/init.sql`), se crea un usuario administrador por defecto:

- **Usuario:** `admin`
- **Contraseña:** `admin123`

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

> **IMPORTANTE**: Asegúrate de **NO** subir el archivo `.env` con credenciales reales o secretos de producción a tu repositorio público de GitHub. Utiliza siempre `.env.example` como plantilla.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**.
