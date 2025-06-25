// Configuración de URLs base
const config = {
  // URLs base para diferentes entornos
  baseUrls: {
    local: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
    production: import.meta.env.VITE_API_URL || 'https://usme-3ofa.onrender.com/api'
  },
  
  // URL actual basada en el entorno
  get baseUrl() {
    // Usamos la URL de desarrollo si estamos en desarrollo, de lo contrario producción
    return import.meta.env.MODE === 'development' 
      ? this.baseUrls.local 
      : this.baseUrls.production;
  },

  // URLs específicas para diferentes recursos
  get urls() {
    return {
      // URLs de autenticación
      auth: {
        login: `${this.baseUrl}/users/login`,
        forgotPassword: `${this.baseUrl}/users/forgot-password`,
        resetPassword: (token) => `${this.baseUrl}/users/reset-password/${token}`,
      },
      
      // URLs de usuarios y roles
      users: `${this.baseUrl}/users`,
      roles: `${this.baseUrl}/roles`,
      
      // URL de tablas a nivel raíz (para DynamicTableList)
      tables: `${this.baseUrl}/inscriptions/tables`,
      
      // URLs de inscripciones y tablas
      inscriptions: {
        base: `${this.baseUrl}/inscriptions`,
        pi: `${this.baseUrl}/inscriptions/pi`,
        tables: `${this.baseUrl}/inscriptions/tables`,
        providers: `${this.baseUrl}/inscriptions/tables?tableType=provider`,
        inscriptionsTables: `${this.baseUrl}/inscriptions/tables?tableType=inscription`,
        primaryTables: `${this.baseUrl}/inscriptions/tables?isPrimary=true`,
        downloadZip: `${this.baseUrl}/inscriptions/download-multiple-zip`,
      },
      
      // URLs para archivos y registros
      files: {
        upload: (tableName, recordId) => `${this.baseUrl}/inscriptions/tables/${tableName}/record/${recordId}/upload`,
        delete: (tableName, recordId, fileId) => `${this.baseUrl}/inscriptions/tables/${tableName}/record/${recordId}/file/${fileId}`,
        compliance: (tableName, recordId, fileId) => `${this.baseUrl}/inscriptions/tables/${tableName}/record/${recordId}/file/${fileId}/compliance`,
      },
      
      // URLs para historial
      history: (tableName, recordId) => `${this.baseUrl}/inscriptions/tables/${tableName}/record/${recordId}/history`,
    };
  }
};

export default config; 