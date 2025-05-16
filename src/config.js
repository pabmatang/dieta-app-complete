// Configuración para diferentes entornos
const isDevelopment = import.meta.env.DEV;
export const BACKEND_URL = "https://dieta-app-kqhb.onrender.com";
// URLs base para la API
const config = {
  // URL de la API en desarrollo (local)
  development: {
    apiUrl: "http://localhost:8000",
  },
  // URL de la API en producción (Render)
  production: {
    apiUrl: "https://dieta-app-kqhb.onrender.com", // Ajusta esto con la URL real de tu backend en Render
  },
};

// Exportar la configuración según el entorno
export default isDevelopment ? config.development : config.production; 
