#!/bin/bash

echo "🚀 Iniciando proceso de despliegue..."

# Verificar que estamos en la rama main
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Error: Debes estar en la rama main para desplegar"
    exit 1
fi

# Verificar que no hay cambios pendientes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Hay cambios pendientes. Haz commit antes de desplegar"
    git status
    exit 1
fi

echo "✅ Repositorio limpio, procediendo con el despliegue..."

# Hacer push de los cambios
echo "📤 Haciendo push de los cambios..."
git push origin main

echo "✅ Despliegue iniciado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a Render.com y crea el servicio web"
echo "2. Configura las variables de entorno"
echo "3. Crea la base de datos PostgreSQL en Render"
echo "4. Ve a Netlify.com y conecta el repositorio"
echo "5. Configura el directorio base como 'impulso-capital-front'"
echo ""
echo "📖 Consulta DEPLOYMENT.md para instrucciones detalladas" 