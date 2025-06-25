const jwt = require('jsonwebtoken');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
require('dotenv').config();

// Middleware para autenticar el token JWT
const authenticateJWT = (req, res, next) => {
  // console.log("Authorization header:", req.headers.authorization); // Para revisar si el token llega correctamente

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Token no proporcionado o mal formateado' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = decoded; // Guardar la información del usuario decodificada en la solicitud
    next();
  });
};


// Middleware para verificar roles
const authenticateRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
};

// Middleware para verificar permisos
const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // console.log("=== AUTORIZACIÓN ===");
      // console.log("Verificando permisos para el rol:", req.user.role);
      // console.log("Permiso requerido:", requiredPermission);

      // Cargar el rol y todos sus permisos
      const role = await Role.findByPk(req.user.role, {
        include: {
          model: Permission,
          as: 'permissions',
        },
      });

      if (!role) {
        // console.log("Permiso denegado. El rol no existe.");
        return res.status(403).json({ message: 'Permiso denegado' });
      }

      // Verificar si el permiso requerido está en la lista de permisos del rol
      const hasPermission = role.permissions.some(
        (perm) => perm.permission_name === requiredPermission
      );

      if (!hasPermission) {
        // console.log("Permiso denegado. El rol no tiene el permiso requerido.");
        return res.status(403).json({ message: 'Permiso denegado' });
      }

      // console.log("Permiso concedido.");
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error verificando permisos', error: error.message });
    }
  };
};



module.exports = { authenticateJWT, authenticateRole, authorizePermission };

