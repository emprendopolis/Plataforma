const { uploadFileToGCS, getSignedUrlFromGCS } = require('../utils/gcs');
const { Sequelize, QueryTypes } = require('sequelize');
const sequelize = require('../utils/sequelize');
const multer = require('multer');
const { Parser } = require('json2csv');
const csvParser = require('csv-parser');
const fs = require('fs');
const TablesMetadata = require('../models/TablesMetadata');
const User = require('../models/User');
const File = require('../models/File');
const Comment = require('../models/Comments');
const path = require('path');
const archiver = require('archiver');
// src/controllers/inscriptionController.js

const { DataTypes } = require('sequelize');
const FieldPreference = require('../models/FieldPreference')(sequelize, DataTypes);


// Función auxiliar para insertar en el historial
async function insertHistory(tableName, recordId, userId, changeType, fieldName, oldValue, newValue, description) {
  await sequelize.query(
    `INSERT INTO record_history (table_name, record_id, user_id, change_type, field_name, old_value, new_value, description)
     VALUES (:tableName, :recordId, :userId, :changeType, :fieldName, :oldValue, :newValue, :description)`,
    {
      replacements: {
        tableName,
        recordId,
        userId, // Se usa el parámetro userId tal como viene
        changeType,
        fieldName: fieldName || null,
        oldValue: oldValue || null,
        newValue: newValue || null,
        description: description || null
      },
      type: sequelize.QueryTypes.INSERT,
    }
  );
}




// ----------------------------------------------------------------------------------------
// -------------------------------- CONTROLADOR createTable -------------------------------
// ----------------------------------------------------------------------------------------

exports.createTable = async (req, res) => {
  // Extrae 'table_name' y 'fields' del cuerpo de la solicitud.
  const { table_name, fields } = req.body;

  try {
    // Validar que 'table_name' y 'fields' sean proporcionados y que 'fields' no esté vacío.
    if (!table_name || !fields || fields.length === 0) {
      // Si la validación falla, se devuelve un error 400 indicando que faltan datos.
      return res.status(400).json({ message: 'El nombre de la tabla y los campos son requeridos' });
    }

         // Validar que el nombre de la tabla comience con 'inscription_', 'provider_', 'kit_', 'pi_' o 'master_'.
     // Esto garantiza que el nombre de la tabla siga un estándar definido.
     const prefixedTableName =
       table_name.startsWith('inscription_') ||
       table_name.startsWith('provider_') ||
       table_name.startsWith('kit_') ||
       table_name.startsWith('pi_') ||
       table_name.startsWith('master_');
     if (!prefixedTableName) {
       // Si el nombre no cumple con los prefijos, devuelve un error 400.
       return res.status(400).json({
         message: 'El nombre de la tabla debe empezar con inscription_, provider_, kit_, pi_ o master_',
      });
    }

    // Obtener el queryInterface de Sequelize, que permite ejecutar consultas de forma dinámica.
    const queryInterface = sequelize.getQueryInterface();

    // Mapeo de tipos de datos válidos para los campos que se van a crear en la tabla.
    const validTypes = {
      'VARCHAR(255)': Sequelize.STRING, // Texto con longitud máxima de 255 caracteres.
      'TEXT': Sequelize.TEXT,           // Texto sin límite de longitud.
      'INTEGER': Sequelize.INTEGER,     // Número entero.
      'BIGINT': Sequelize.BIGINT,       // Número entero grande (bigint).
      'DECIMAL': Sequelize.DECIMAL,     // Número decimal para almacenar valores numéricos con precisión.
      'BOOLEAN': Sequelize.BOOLEAN,     // Valores booleanos (true/false).
      'DATE': Sequelize.DATE,           // Fechas.
      'FOREIGN_KEY': Sequelize.INTEGER, // Para claves foráneas, usa INTEGER.
    };

    // Definir las columnas iniciales de la tabla, incluyendo la columna 'id' que es primaria y autoincremental.
    const columns = {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,     // Define la columna 'id' como la clave primaria.
        autoIncrement: true,  // Hace que 'id' se incremente automáticamente con cada nuevo registro.
      },
    };

    // Iterar sobre los campos proporcionados para agregar cada columna a la tabla.
    for (const field of fields) {
      // Validar que cada campo tenga un nombre.
      if (!field.name || field.name.trim() === '') {
        // Si el nombre del campo está vacío, devolver un error 400.
        return res.status(400).json({ message: 'Todos los campos deben tener un nombre' });
      }

      // Determinar si la columna permite valores nulos. Por defecto, se permite.
      const allowNull = field.allow_null !== false;

      // Verificar si el campo es de tipo 'FOREIGN_KEY' para configurar la relación.
      if (field.type === 'FOREIGN_KEY') {
        // Si es una clave foránea, asegurar que se haya proporcionado la tabla relacionada.
        if (!field.relatedTable) {
          return res.status(400).json({
            message: `El campo ${field.name} es una clave foránea, pero no se proporcionó la tabla relacionada`,
          });
        }

        // Definir la columna de clave foránea con la referencia a la tabla relacionada.
        columns[field.name] = {
          type: Sequelize.INTEGER, // Las claves foráneas se almacenan como enteros.
          allowNull: allowNull,    // Permite nulos si 'allowNull' es true.
          references: {
            model: field.relatedTable, // Especifica la tabla relacionada.
            key: 'id',                 // La columna de referencia en la tabla relacionada.
          },
          onUpdate: 'CASCADE',         // Si el ID de la tabla relacionada cambia, se actualiza automáticamente.
          onDelete: 'SET NULL',        // Si el registro relacionado se elimina, la referencia se establece en null.
        };
      } else {
        // Validar el tipo de dato del campo y mapearlo a un tipo de Sequelize.
        const sequelizeType = validTypes[field.type];
        if (!sequelizeType) {
          // Si el tipo de dato no es válido, devolver un error 400.
          return res.status(400).json({
            message: `Tipo de dato no válido para el campo ${field.name}: ${field.type}`,
          });
        }

        // Definir la columna con el tipo de dato correspondiente.
        columns[field.name] = {
          type: sequelizeType,
          allowNull: allowNull, // Permitir nulos si 'allowNull' es true.
        };
      }
    }

    // Crear la tabla usando queryInterface con las columnas definidas.
    await queryInterface.createTable(table_name, columns);

    // Registrar la tabla en la metadata para mantener un registro de las tablas creadas.
    await TablesMetadata.create({ table_name });

    // Devolver una respuesta exitosa con un mensaje indicando que la tabla fue creada.
    res.status(201).json({ message: `Tabla ${table_name} creada con éxito` });
  } catch (error) {
    // Capturar cualquier error y devolver un error 500 con el mensaje correspondiente.
    console.error('Error creando la tabla:', error);
    res.status(500).json({ message: 'Error creando la tabla', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// -------------------------------- CONTROLADOR listTables --------------------------------
// ----------------------------------------------------------------------------------------

exports.listTables = async (req, res) => {
  try {
    // Obtener el tipo de tabla y si es principal a partir de los parámetros de la consulta.
    // 'tableType' define el tipo de tabla a buscar (e.g., provider, pi, inscription).
    // 'isPrimary' indica si se desea filtrar solo las tablas principales.
    const { tableType, isPrimary } = req.query;

    // Determinar el prefijo de búsqueda según el tipo de tabla proporcionado.
    let tablePrefix;
    if (tableType === 'provider') {
      tablePrefix = 'provider_%'; // Prefijo para tablas de tipo 'provider'.
    } else if (tableType === 'provider_kit') {
      tablePrefix = 'kit_%'; // Prefijo para tablas de tipo 'provider_kit' (nuevo formato: kit_*)
    } else if (tableType === 'master') {
      tablePrefix = 'master_%'; // Prefijo para tablas de tipo 'master'
    } else if (tableType === 'pi') {
      tablePrefix = 'pi_%'; // Prefijo para tablas de tipo 'pi'.
    } else {
      tablePrefix = 'inscription_%'; // Prefijo por defecto para tablas de tipo 'inscription'.
    }

    // Consultar las tablas en la base de datos que coinciden con el prefijo determinado.
    const [tables] = await sequelize.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE :tablePrefix
    `,
      {
        replacements: { tablePrefix }, // Reemplazar el parámetro 'tablePrefix' en la consulta.
      }
    );

    // Obtener la información de metadata para saber cuáles tablas son principales.
    // Esto recupera todos los registros de la tabla 'TablesMetadata'.
    const metadata = await TablesMetadata.findAll();

    // Añadir la propiedad 'is_primary' a cada tabla basada en la metadata.
    // Mapea las tablas consultadas y verifica si cada una es principal según su registro en 'metadata'.
    let tableList = tables.map((table) => {
      const metadataRecord = metadata.find((meta) => meta.table_name === table.table_name);
      return {
        table_name: table.table_name,
        is_primary: metadataRecord ? metadataRecord.is_primary : false, // Si está en 'metadata', tomar su valor de 'is_primary'.
      };
    });

    // Si 'isPrimary' se especifica como 'true', filtrar las tablas que son principales.
    if (isPrimary === 'true') {
      tableList = tableList.filter((table) => table.is_primary === true);
    }

    // Verificar si no se encontraron tablas tras el filtrado.
    // Si no hay tablas, devolver un mensaje indicando que no se encontraron resultados.
    if (tableList.length === 0) {
      return res.status(404).json({ message: `No se encontraron tablas para el tipo ${tableType}` });
    }

    // Si se encontraron tablas, devolver la lista como respuesta exitosa.
    res.status(200).json(tableList);
  } catch (error) {
    // Capturar cualquier error ocurrido durante la ejecución y devolver un mensaje de error.
    console.error('Error listando las tablas:', error);
    res.status(500).json({ message: 'Error listando las tablas', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// -------------------------------- CONTROLADOR deleteTable -------------------------------
// ----------------------------------------------------------------------------------------

exports.deleteTable = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  try {
    // Verificar si la tabla está vacía antes de intentar eliminarla.
    // Ejecuta una consulta SQL para contar los registros existentes en la tabla.
    const [records] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table_name}`);
    const recordCount = records[0].count;

    // Si la tabla contiene registros (count > 0), no se permite eliminarla.
    if (recordCount > 0) {
      return res.status(400).json({
        message: `No se puede eliminar la tabla ${table_name} porque no está vacía.`,
      });
    }

    // Si la tabla está vacía (count === 0), proceder a eliminarla.
    await sequelize.getQueryInterface().dropTable(table_name);

    // Devolver una respuesta exitosa indicando que la tabla fue eliminada.
    res.status(200).json({ message: `Tabla ${table_name} eliminada con éxito` });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error eliminando la tabla:', error);
    res.status(500).json({ message: 'Error eliminando la tabla', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ------------------------------ CONTROLADOR editTable -----------------------------------
// ----------------------------------------------------------------------------------------

exports.editTable = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  // 'fieldsToAdd' y 'fieldsToDelete' se obtienen del cuerpo de la solicitud para saber qué columnas agregar o eliminar.
  const { table_name } = req.params;
  const { fieldsToAdd, fieldsToDelete } = req.body;

  try {
    // Obtener el queryInterface de Sequelize para realizar modificaciones en la tabla.
    const queryInterface = sequelize.getQueryInterface();

    // Mapeo de tipos de datos válidos que se pueden usar para crear nuevas columnas.
    const validTypes = {
      'VARCHAR(255)': Sequelize.STRING,
      'CHARACTER VARYING': Sequelize.STRING,
      'TEXT': Sequelize.TEXT,
      'INTEGER': Sequelize.INTEGER,
      'BIGINT': Sequelize.BIGINT,
      'DECIMAL': Sequelize.DECIMAL,
      'BOOLEAN': Sequelize.BOOLEAN,
      'DATE': Sequelize.DATE,
      'FOREIGN_KEY': Sequelize.INTEGER, // Claves foráneas se manejan como INTEGER.
    };

    // Verificar que no se envíen campos para editar. Este controlador solo permite agregar o eliminar columnas.
    if (req.body.fieldsToEdit && req.body.fieldsToEdit.length > 0) {
      return res.status(400).json({ message: 'No se permite editar campos existentes' });
    }

    // ----------------------------------------------------------------------------------------
    // ------------------------- AGREGAR NUEVAS COLUMNAS --------------------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar si hay campos para agregar.
    if (fieldsToAdd && fieldsToAdd.length > 0) {
      for (const field of fieldsToAdd) {
        // Validar que cada campo tenga un nombre.
        if (!field.name || field.name.trim() === '') {
          return res.status(400).json({ message: 'El nombre del campo es requerido' });
        }

        // Determinar si la columna permite valores nulos. Por defecto, se permite.
        const allowNull = field.allow_null !== false;

        // Verificar si el campo es una clave foránea (FOREIGN_KEY).
        if (field.type.toUpperCase() === 'FOREIGN_KEY') {
          // Validar que se especifique la tabla y la columna relacionadas.
          if (!field.relatedTable || !field.relatedColumn) {
            return res.status(400).json({
              message: `Debe especificar una tabla y columna relacionada para la clave foránea en el campo ${field.name}`,
            });
          }

          // Agregar la columna de clave foránea con referencia a la tabla relacionada.
          await queryInterface.addColumn(table_name, field.name, {
            type: Sequelize.INTEGER, // Las claves foráneas se almacenan como enteros.
            references: {
              model: field.relatedTable, // Tabla relacionada.
              key: field.relatedColumn,  // Columna de referencia en la tabla relacionada.
            },
            onUpdate: 'CASCADE',         // Si el valor de la clave cambia en la tabla relacionada, se actualiza aquí también.
            onDelete: 'SET NULL',        // Si se elimina la referencia, la clave foránea se establece en null.
            allowNull,
          });
        } else {
          // Si el campo no es una clave foránea, validar que el tipo de dato sea válido.
          const sequelizeType = validTypes[field.type.toUpperCase()];
          if (!sequelizeType) {
            return res.status(400).json({ message: `Tipo de dato no válido: ${field.type}` });
          }

          // Agregar la columna con el tipo de dato especificado.
          await queryInterface.addColumn(table_name, field.name, {
            type: sequelizeType,
            allowNull,
          });
        }
      }
    }

    // ----------------------------------------------------------------------------------------
    // ------------------------- ELIMINAR COLUMNAS --------------------------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar si hay campos para eliminar.
    if (fieldsToDelete && fieldsToDelete.length > 0) {
      for (const field of fieldsToDelete) {
        const columnName = field.column_name;

        // Verificar si la columna contiene datos antes de eliminarla.
        const [{ count }] = await sequelize.query(
          `SELECT COUNT(*) as count FROM "${table_name}" WHERE "${columnName}" IS NOT NULL`,
          { type: Sequelize.QueryTypes.SELECT }
        );

        // Si la columna contiene datos, no se permite eliminarla.
        if (parseInt(count, 10) > 0) {
          return res.status(400).json({
            message: `No se puede eliminar la columna "${columnName}" porque contiene datos.`,
          });
        }

        // Verificar si la columna tiene restricciones de clave foránea.
        const foreignKeys = await sequelize.query(
          `
          SELECT constraint_name
          FROM information_schema.key_column_usage
          WHERE table_name = :table_name
          AND column_name = :column_name
        `,
          {
            replacements: { table_name, column_name: columnName },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        // Si la columna está involucrada en una clave foránea, no se puede eliminar.
        if (foreignKeys.length > 0) {
          return res.status(400).json({
            message: `No se puede eliminar la columna "${columnName}" porque tiene restricciones de clave foránea.`,
          });
        }

        // Si la columna no tiene datos ni restricciones de claves foráneas, proceder a eliminarla.
        await queryInterface.removeColumn(table_name, columnName);
      }
    }

    // Devolver un mensaje de éxito indicando que la tabla fue actualizada.
    res.status(200).json({ message: `Tabla "${table_name}" actualizada con éxito` });
  } catch (error) {
    // Capturar cualquier error y devolver un mensaje de error.
    console.error('Error editando la tabla:', error);
    res.status(500).json({ message: 'Error editando la tabla', error: error.message });
  }
};


// ----------------------------------------------------------------------------------------
// ------------------------------ CONTROLADOR addRecord -----------------------------------
// ----------------------------------------------------------------------------------------

exports.addRecord = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  // 'recordData' contiene los datos del nuevo registro a agregar, y se extrae del cuerpo de la solicitud.
  const { table_name } = req.params;
  const recordData = req.body;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------------- VALIDACIÓN DEL NOMBRE DE LA TABLA -----------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar que el nombre de la tabla comience con 'inscription_', 'provider_', 'pi_', 'kit_' o 'master_'.
    // Esto garantiza que solo se agreguen registros a tablas que cumplan con el estándar definido.
    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_') &&
      !table_name.startsWith('kit_') &&
      !table_name.startsWith('master_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    // Obtener el modelo de la tabla dinámica a partir del nombre usando Sequelize.
    const Table = sequelize.model(table_name);

    // ----------------------------------------------------------------------------------------
    // ------------------- VALIDACIÓN DE RELACIONES DE CLAVES FORÁNEAS -------------------------
    // ----------------------------------------------------------------------------------------

    // Iterar sobre los campos de 'recordData' para validar si hay claves foráneas.
    // Si un campo contiene 'relatedTable', significa que es una clave foránea.
    for (const key in recordData) {
      if (recordData[key].relatedTable) {
        // Realizar una consulta para verificar si existe el registro relacionado en la tabla indicada.
        const [relatedRecord] = await sequelize.query(
          `SELECT id FROM ${recordData[key].relatedTable} WHERE id = ${recordData[key]}`
        );

        // Si no se encuentra el registro relacionado, devolver un error 400 indicando que la referencia es inválida.
        if (!relatedRecord) {
          return res.status(400).json({
            message: `Registro relacionado no encontrado en ${recordData[key].relatedTable}`,
          });
        }
      }
    }

    // ----------------------------------------------------------------------------------------
    // ------------------------- CREACIÓN DEL NUEVO REGISTRO ----------------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un nuevo registro en la tabla usando los datos validados de 'recordData'.
    const newRecord = await Table.create(recordData);

    // Devolver una respuesta exitosa con un mensaje y los detalles del nuevo registro creado.
    res.status(201).json({ message: 'Registro añadido con éxito', newRecord });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error añadiendo registro:', error);
    res.status(500).json({ message: 'Error añadiendo registro', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------------- CONTROLADOR getTableFields -------------------------------
// ----------------------------------------------------------------------------------------

exports.getTableFields = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  try {
    // Verificar que el nombre de la tabla sea válido y tenga un prefijo permitido
    // console.log(`Consultando campos para la tabla: ${table_name}`);

    // Realiza una consulta a la base de datos para obtener los campos de la tabla especificada.
    // La consulta obtiene el nombre de la columna, tipo de dato, si permite nulos y, si aplica, las relaciones de claves foráneas.
    const [fields] = await sequelize.query(`
      SELECT 
        c.column_name, 
        c.data_type,
        c.is_nullable,
        tc.constraint_type,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON LOWER(c.table_name) = LOWER(kcu.table_name)
        AND LOWER(c.column_name) = LOWER(kcu.column_name)
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND tc.constraint_type = 'FOREIGN KEY'
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE LOWER(c.table_name) = LOWER(:table_name)
        AND c.table_schema = 'public'
    `, {
      replacements: { table_name }
    });

    // Si no se encuentran campos para la tabla, devolver un error 404 indicando que no hay resultados.
    if (fields.length === 0) {
      return res.status(404).json({ message: `No se encontraron campos para la tabla ${table_name}` });
    }

    // Mapear los tipos de datos de PostgreSQL a tipos de datos más amigables para el frontend.
    const fieldDataTypes = fields.map(field => {
      let mappedType;
      switch (field.data_type) {
        case 'character varying':
        case 'varchar':
          mappedType = 'VARCHAR(255)';
          break;
        case 'text':
          mappedType = 'TEXT';
          break;
        case 'integer':
          mappedType = 'INTEGER';
          break;
        case 'bigint':
          mappedType = 'BIGINT';
          break;
        case 'numeric':
        case 'decimal':
          mappedType = 'DECIMAL';
          break;
        case 'boolean':
          mappedType = 'BOOLEAN';
          break;
        case 'date':
        case 'timestamp without time zone':
          mappedType = 'DATE';
          break;
        default:
          mappedType = field.data_type.toUpperCase();
      }

      return {
        ...field,
        data_type: mappedType,
      };
    });

    // Devolver la lista de campos con sus tipos mapeados como respuesta exitosa.
    res.status(200).json(fieldDataTypes);
  } catch (error) {
    console.error('Error obteniendo los campos de la tabla:', error);
    res.status(500).json({ message: 'Error obteniendo los campos de la tabla', error: error.message });
  }
};


// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR downloadCsvTemplate ----------------------------
// ----------------------------------------------------------------------------------------

exports.downloadCsvTemplate = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------------ OBTENER LOS CAMPOS DE LA TABLA --------------------------------
    // ----------------------------------------------------------------------------------------

    // Realiza una consulta para obtener los nombres de las columnas y sus tipos de dato
    // desde 'information_schema' para la tabla especificada.
    const [fields] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${table_name}'
      AND table_schema = 'public'
    `);

    // Si no se encuentran columnas para la tabla, devolver un error 404.
    if (fields.length === 0) {
      return res.status(404).json({
        message: `No se encontraron campos para la tabla ${table_name}`,
      });
    }

    // ----------------------------------------------------------------------------------------
    // ------------------- CREACIÓN DE DATOS DE EJEMPLO PARA EL CSV ----------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un objeto con valores de ejemplo para cada columna.
    // Se usa el nombre de la columna como clave y un valor de ejemplo basado en el nombre.
    const exampleData = fields.reduce((acc, field) => {
      acc[field.column_name] = `ejemplo_${field.column_name}`;
      return acc;
    }, {});

    // ----------------------------------------------------------------------------------------
    // -------------------- GENERAR CSV USANDO json2csv ---------------------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un parser de JSON a CSV con los nombres de las columnas como campos.
    const json2csvParser = new Parser({ fields: fields.map(f => f.column_name) });

    // Generar el CSV usando los datos de ejemplo. 
    // Se pasa un array con un solo objeto 'exampleData' para generar una plantilla de ejemplo.
    const csv = json2csvParser.parse([exampleData]);

    // ----------------------------------------------------------------------------------------
    // ------------------------- CONFIGURAR Y ENVIAR EL CSV -----------------------------------
    // ----------------------------------------------------------------------------------------

    // Configurar el encabezado de la respuesta para indicar que es un archivo CSV.
    res.header('Content-Type', 'text/csv');

    // Configurar la respuesta para descargar el archivo con un nombre basado en el nombre de la tabla.
    res.attachment(`${table_name}_template.csv`);

    // Enviar el contenido del archivo CSV al cliente.
    return res.send(csv);

  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error al generar la plantilla CSV:', error);
    return res.status(500).json({
      message: 'Error generando la plantilla CSV',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ---------------------------- CONTROLADOR uploadCsv -------------------------------------
// ----------------------------------------------------------------------------------------

exports.uploadCsv = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  console.log('🔍 [uploadCsv] Iniciando carga CSV para tabla:', table_name);

  // Verificar si el archivo CSV fue cargado.
  if (!req.file) {
    return res.status(400).json({ message: 'Por favor sube un archivo CSV' });
  }

  try {
    // ----------------------------------------------------------------------------------------
    // -------------------------- VERIFICAR EXISTENCIA DE LA TABLA ----------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar si la tabla especificada existe en la base de datos.
    const [tableExists] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${table_name}'
    `);

    // Si la tabla no existe, devolver un error 404.
    if (tableExists.length === 0) {
      return res.status(404).json({ message: `La tabla ${table_name} no existe` });
    }

    // ----------------------------------------------------------------------------------------
    // ---------------------- OBTENER LAS COLUMNAS DE LA TABLA --------------------------------
    // ----------------------------------------------------------------------------------------

    // Obtener las columnas de la tabla desde 'information_schema'.
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = '${table_name}'
      AND table_schema = 'public'
    `);

    // Si no se encuentran columnas, devolver un error 404.
    if (columns.length === 0) {
      return res.status(404).json({ message: `No se encontraron columnas para la tabla ${table_name}` });
    }

    // ----------------------------------------------------------------------------------------
    // -------------- DEFINIR EL MODELO DE LA TABLA DINÁMICAMENTE -----------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un mapeo de tipos de datos válidos de Sequelize.
    const validTypes = {
      varchar: Sequelize.STRING,
      'character varying': Sequelize.STRING, // Soporte para VARCHAR.
      text: Sequelize.TEXT,                  // Soporte para TEXT.
      integer: Sequelize.INTEGER,
      bigint: Sequelize.BIGINT,              // Soporte para BIGINT.
      boolean: Sequelize.BOOLEAN,
      date: Sequelize.DATE,
    };

    // Configurar las columnas del modelo basado en las columnas de la tabla.
    const tableColumns = columns.reduce((acc, column) => {
      const sequelizeType = validTypes[column.data_type.toLowerCase()];
      if (sequelizeType) {
        acc[column.column_name] = {
          type: sequelizeType,
          allowNull: true,
        };

        // Si la columna 'id' es autoincremental, marcarla como clave primaria.
        if (
          column.column_name === 'id' &&
          column.column_default &&
          column.column_default.includes('nextval')
        ) {
          acc[column.column_name].primaryKey = true;
          acc[column.column_name].autoIncrement = true;
        }
      } else {
        // console.log(`Tipo de dato no válido para la columna: ${column.column_name}`); // Verificación de tipo de dato.
      }
      return acc;
    }, {});

    // Definir el modelo de la tabla dinámicamente, desactivando la creación de columna 'id' por defecto.
    const Table = sequelize.define(table_name, tableColumns, {
      timestamps: false,
      freezeTableName: true, // Evitar pluralizar el nombre de la tabla.
    });

    // Crear un mapeo de tipos de datos para uso en el procesamiento
    const columnTypes = {};
    columns.forEach(column => {
      columnTypes[column.column_name] = column.data_type;
    });

    // ----------------------------------------------------------------------------------------
    // ---------------------------- PROCESAR Y LEER EL ARCHIVO CSV ----------------------------
    // ----------------------------------------------------------------------------------------

    const filePath = req.file.path; // Ruta temporal del archivo subido.
    const results = []; // Array para almacenar los datos procesados.

    // Leer y parsear el CSV usando 'csv-parser'.
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        
        // Tratar los valores del CSV y convertirlos a un formato adecuado para la base de datos.
        const processedData = Object.keys(data).reduce((acc, key) => {
          if (tableColumns[key]) {
            // Asegurarse de que los valores no sean nulos para los campos de tipo VARCHAR y TEXT.
            if (tableColumns[key].type === Sequelize.STRING || tableColumns[key].type === Sequelize.TEXT) {
              acc[key] = data[key] ? data[key].toString().trim() : ''; // Convertir a cadena y limpiar espacios.
            } else if (tableColumns[key].type === Sequelize.INTEGER || tableColumns[key].type === Sequelize.BIGINT) {
              // Manejar campos INTEGER - convertir vacíos a null o 0
              if (data[key] === '' || data[key] === null || data[key] === undefined) {
                acc[key] = null; // Usar null para campos vacíos en INTEGER
              } else {
                const intValue = parseInt(data[key]);
                acc[key] = isNaN(intValue) ? null : intValue;
              }
            } else if (tableColumns[key].type === Sequelize.BOOLEAN) {
              // Manejar campos BOOLEAN
              if (data[key] === '' || data[key] === null || data[key] === undefined) {
                acc[key] = null;
              } else {
                acc[key] = data[key] === 'true' || data[key] === '1' || data[key] === true;
              }
            } else {
              // Para otros tipos, aplicar lógica específica basada en el tipo de datos real
              const dataType = columnTypes[key];
              
              if (dataType === 'integer' || dataType === 'bigint') {
                // Manejar campos INTEGER/BIGINT
                if (data[key] === '' || data[key] === null || data[key] === undefined) {
                  acc[key] = null;
                } else {
                  const intValue = parseInt(data[key]);
                  acc[key] = isNaN(intValue) ? null : intValue;
                }
              } else if (dataType === 'text' || dataType === 'character varying') {
                // Manejar campos TEXT/VARCHAR
                acc[key] = data[key] ? data[key].toString().trim() : '';
              } else if (dataType === 'boolean') {
                // Manejar campos BOOLEAN
                if (data[key] === '' || data[key] === null || data[key] === undefined) {
                  acc[key] = null;
                } else {
                  acc[key] = data[key] === 'true' || data[key] === '1' || data[key] === true;
                }
              } else {
                // Para otros tipos, asignar el valor directamente
                acc[key] = data[key];
              }
            }
          } else {
            console.log('⚠️ Columna no encontrada en tabla:', key);
          }
          return acc;
        }, {});

        // Eliminar la columna 'id' si es autoincremental, ya que se genera automáticamente.
        if ('id' in processedData && tableColumns['id'] && tableColumns['id'].autoIncrement) {
          delete processedData['id'];
        }

        results.push(processedData); // Agregar los datos procesados al array.
      })
      .on('end', async () => {
        try {
          // ----------------------------------------------------------------------------------------
          // ----------------------- INSERTAR DATOS EN LA TABLA -------------------------------------
          // ----------------------------------------------------------------------------------------

          console.log(`✅ [uploadCsv] Insertados ${results.length} registros en ${table_name}`);

          // Insertar los datos del CSV en la tabla usando 'bulkCreate' para realizar la inserción masiva.
          await Table.bulkCreate(results, { validate: true });

          // Responder con un mensaje de éxito si la inserción es exitosa.
          res.status(201).json({ message: 'Datos insertados con éxito en la tabla' });
        } catch (error) {
          console.error('❌ [uploadCsv] Error insertando datos:', error.message);
          res.status(500).json({
            message: 'Error insertando datos en la tabla',
            error: error.message,
          });
        } finally {
          // Eliminar el archivo CSV temporal para liberar espacio.
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkError) {
            console.log('⚠️ Error eliminando archivo temporal:', unlinkError.message);
          }
        }
      })
      .on('error', (error) => {
        console.error('❌ [uploadCsv] Error leyendo archivo CSV:', error.message);
        res.status(500).json({
          message: 'Error leyendo el archivo CSV',
          error: error.message,
        });
      });
  } catch (error) {
    console.error('❌ [uploadCsv] Error general:', error.message);
    res.status(500).json({
      message: 'Error procesando el archivo CSV',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR downloadCsvData ----------------------------------
// ----------------------------------------------------------------------------------------

exports.downloadCsvData = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  try {
    // ----------------------------------------------------------------------------------------
    // -------------------------- VERIFICAR EXISTENCIA DE LA TABLA ----------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar si la tabla especificada existe en la base de datos.
    const [tableExists] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${table_name}'
    `);

    // Si la tabla no existe, devolver un error 404.
    if (tableExists.length === 0) {
      return res.status(404).json({ message: `La tabla ${table_name} no existe` });
    }

    // ----------------------------------------------------------------------------------------
    // ---------------------- OBTENER LAS COLUMNAS DE LA TABLA --------------------------------
    // ----------------------------------------------------------------------------------------

    // Obtener los nombres de las columnas de la tabla desde 'information_schema'.
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${table_name}'
      AND table_schema = 'public'
    `);

    // Si no se encuentran columnas, devolver un error 404.
    if (columns.length === 0) {
      return res.status(404).json({ message: `No se encontraron columnas para la tabla ${table_name}` });
    }

    // ----------------------------------------------------------------------------------------
    // -------------------------- OBTENER LOS DATOS DE LA TABLA --------------------------------
    // ----------------------------------------------------------------------------------------

    // Obtener todos los registros de la tabla.
    const [rows] = await sequelize.query(`SELECT * FROM ${table_name}`);

    // ----------------------------------------------------------------------------------------
    // --------------------------- GENERAR CSV USANDO json2csv ---------------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un parser de JSON a CSV con los nombres de las columnas como campos.
    const json2csvParser = new Parser({ fields: columns.map(c => c.column_name) });

    // Generar el CSV usando los datos de la tabla.
    const csv = json2csvParser.parse(rows);

    // ----------------------------------------------------------------------------------------
    // ---------------------------- CONFIGURAR Y ENVIAR EL CSV --------------------------------
    // ----------------------------------------------------------------------------------------

    // Configurar el encabezado de la respuesta para indicar que es un archivo CSV.
    res.header('Content-Type', 'text/csv');

    // Configurar la respuesta para descargar el archivo con un nombre basado en el nombre de la tabla.
    res.attachment(`${table_name}_data.csv`);

    // Enviar el contenido del archivo CSV al cliente.
    return res.send(csv);

  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error al generar el CSV de datos:', error);
    return res.status(500).json({
      message: 'Error generando el CSV de datos',
      error: error.message,
    });
  }
};


// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR getTableRecords --------------------------------
// ----------------------------------------------------------------------------------------

exports.getTableRecords = async (req, res) => {
  const { table_name } = req.params; // Nombre de la tabla
  const filters = req.query; // Filtros pasados en la query string

  // Log de depuración para ver el usuario autenticado
  console.log('req.user:', req.user);

  try {
    // Validar que el nombre de la tabla sea válido
    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_') &&
      !table_name.startsWith('kit_') &&
      !table_name.startsWith('master_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    // Obtener los campos de la tabla desde la metadata de la base de datos
    const [fields] = await sequelize.query(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE LOWER(table_name) = LOWER(:table_name)
    `,
      {
        replacements: { table_name },
      }
    );

    // Base de la consulta SQL
    let query = `SELECT "${table_name}".* FROM "${table_name}"`;
    const replacements = {}; // Reemplazos para los parámetros dinámicos
    const whereClauses = []; // Condiciones WHERE

    // Manejo específico para tablas que empiezan con "pi_"
    if (table_name.startsWith('pi_')) {
      query += `
        INNER JOIN inscription_caracterizacion 
        ON "${table_name}".caracterizacion_id = inscription_caracterizacion.id
      `;
      whereClauses.push(`inscription_caracterizacion."Estado" = 7`); // Filtro por Estado 7
    }

    // Inicializar contador para generar nombres únicos de parámetros
    let paramIndex = 1;

    // Procesar filtros de la query string
    for (const [key, value] of Object.entries(filters)) {
      const fieldInCurrentTable = fields.find(
        (field) => field.column_name.toLowerCase() === key.toLowerCase()
      );

      const paramName = `param${paramIndex}`; // Nombre del parámetro
      paramIndex++;

      // Condición específica para la tabla "pi_" y el campo "Estado"
      if (table_name.startsWith('pi_') && key === 'Estado') {
        whereClauses.push(`inscription_caracterizacion."Estado" = :${paramName}`);
        replacements[paramName] = value;
      } else if (fieldInCurrentTable) {
        // Si el campo existe en la tabla actual, agregarlo como filtro
        whereClauses.push(`"${table_name}"."${fieldInCurrentTable.column_name}" = :${paramName}`);
        replacements[paramName] = value;
      }
    }

    // === FILTRO DE LOCALIDAD SOLO PARA GESTOR ===
    const { role, localidad } = req.user || {};
    console.log('Valor de table_name:', table_name);
    if (role === 5 && localidad) {
      if (table_name === 'inscription_caracterizacion') {
        whereClauses.push(`"${table_name}"."Localidad de la unidad de negocio" = :localidadGestor`);
        replacements['localidadGestor'] = localidad;
      }
      if (table_name === 'empresas') {
        whereClauses.push(`"${table_name}"."localidad" = :localidadGestor`);
        replacements['localidadGestor'] = localidad;
      }
      // Agrega más condiciones si tienes otras tablas relevantes
    }

    // Construir cláusula WHERE si hay condiciones
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Log para depuración de la consulta generada
    console.log('Consulta SQL generada:', query);
    console.log('Reemplazos:', replacements);

    // Ejecutar la consulta
    const [records] = await sequelize.query(query, { replacements });

    // Mapear registros con sus tipos correspondientes
    const recordsWithTypes = records.map((record) => {
      const newRecord = {};
      for (const [key, value] of Object.entries(record)) {
        const field = fields.find((f) => f.column_name === key);
        if (field && field.data_type === 'boolean') {
          newRecord[key] = value === null ? null : Boolean(value); // Asegurar tipo booleano
        } else {
          newRecord[key] = value;
        }
      }
      return newRecord;
    });

    // Log de los registros obtenidos
    // console.log('Registros obtenidos:', recordsWithTypes);

    // Enviar respuesta con los registros procesados
    res.status(200).json(recordsWithTypes);
  } catch (error) {
    // Manejo de errores y logs para depuración
    console.error('Error obteniendo los registros:', error);
    res.status(500).json({
      message: 'Error obteniendo los registros',
      error: error.message,
    });
  }
};



// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR getTableRecordById -------------------------------
// ----------------------------------------------------------------------------------------

exports.getTableRecordById = async (req, res) => {
  // Extrae 'table_name' y 'record_id' de los parámetros de la solicitud (URL).
  const { table_name, record_id } = req.params;

  try {
    // ----------------------------------------------------------------------------------------
    // -------------------- DEFINIR TIPOS DE DATOS VÁLIDOS Y MODELO DINÁMICO -------------------
    // ----------------------------------------------------------------------------------------

    // Definir un mapeo de tipos de datos válidos para Sequelize.
    const validTypes = {
      varchar: Sequelize.STRING,
      'character varying': Sequelize.STRING,
      text: Sequelize.TEXT,
      integer: Sequelize.INTEGER,
      bigint: Sequelize.BIGINT,
      boolean: Sequelize.BOOLEAN,
      date: Sequelize.DATE,
    };

    // Verificar si el modelo de la tabla ya está definido en Sequelize.
    let Table;
    if (sequelize.isDefined(table_name)) {
      Table = sequelize.model(table_name);
    } else {
      // Si el modelo no está definido, se obtiene la estructura de la tabla y se define el modelo dinámicamente.
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table_name}'
        AND table_schema = 'public'
      `);

      // Si no se encuentran columnas para la tabla, devolver un error 404.
      if (columns.length === 0) {
        return res.status(404).json({
          message: `No se encontraron columnas para la tabla ${table_name}`,
        });
      }

      // Crear el modelo de la tabla basado en los tipos de datos de las columnas.
      const tableColumns = columns.reduce((acc, column) => {
        const sequelizeType = validTypes[column.data_type.toLowerCase()];
        if (sequelizeType) {
          acc[column.column_name] = { type: sequelizeType, allowNull: true };

          // Marcar la columna 'id' como clave primaria si aplica.
          if (column.column_name === 'id') {
            acc[column.column_name].primaryKey = true;
            acc[column.column_name].autoIncrement = true;
          }
        }
        return acc;
      }, {});

      // Definir el modelo de la tabla de forma dinámica.
      Table = sequelize.define(table_name, tableColumns, {
        timestamps: false,
        freezeTableName: true,
      });
    }

    // ----------------------------------------------------------------------------------------
    // ----------------------------- OBTENER EL REGISTRO ESPECÍFICO ----------------------------
    // ----------------------------------------------------------------------------------------

    // Buscar el registro por su ID utilizando el método 'findByPk'.
    const record = await Table.findByPk(record_id);

    // Si el registro no existe, devolver un error 404.
    if (!record) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    // ----------------------------------------------------------------------------------------
    // --------------------------- OBTENER RELACIONES DE CLAVES FORÁNEAS -----------------------
    // ----------------------------------------------------------------------------------------

    // Obtener información sobre las claves foráneas desde 'information_schema'.
    const [fields] = await sequelize.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS related_table
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = '${table_name}'
    `);

    // console.log("Fields with foreign keys:", fields);

    // Crear un objeto para almacenar los datos relacionados.
    const relatedData = {};
    const relatedCache = {}; // Nuevo caché para evitar consultas duplicadas

    for (const field of fields) {
      const relatedTableName = field.related_table;
      const foreignKeyColumn = field.column_name;

      if (relatedTableName) {
        let RelatedTable;
        if (sequelize.isDefined(relatedTableName)) {
          RelatedTable = sequelize.model(relatedTableName);
        } else {
          const [relatedColumns] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = '${relatedTableName}'
            AND table_schema = 'public'
          `);

          const relatedTableColumns = relatedColumns.reduce((acc, column) => {
            const sequelizeType = validTypes[column.data_type.toLowerCase()];
            if (sequelizeType) {
              acc[column.column_name] = { type: sequelizeType, allowNull: true };
              if (column.column_name === 'id') {
                acc[column.column_name].primaryKey = true;
                acc[column.column_name].autoIncrement = true;
              }
            }
            return acc;
          }, {});

          RelatedTable = sequelize.define(relatedTableName, relatedTableColumns, {
            timestamps: false,
            freezeTableName: true,
          });
        }

        // Si ya consultamos esta tabla, reutiliza el resultado
        if (relatedCache[relatedTableName]) {
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
          continue;
        }

        if (relatedTableName === 'users') {
          const relatedRecords = await RelatedTable.findAll({
            attributes: ['id', 'username'],
            limit: 100
          });
          relatedCache[relatedTableName] = relatedRecords.map((record) => ({
            id: record.id,
            displayValue: record.username,
          }));
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
        } else {
          const relatedRecords = await RelatedTable.findAll({
            limit: 100
          });
          let displayField = relatedRecords[0] ? Object.keys(relatedRecords[0].dataValues).find((col) => col !== 'id') : 'id';
          relatedCache[relatedTableName] = relatedRecords.map((record) => ({
            id: record.id,
            displayValue: record[displayField],
          }));
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
        }
      }
    }

    // console.log('Related Data:', relatedData);

    // ----------------------------------------------------------------------------------------
    // ------------------ DEVOLVER EL REGISTRO Y LOS DATOS RELACIONADOS -----------------------
    // ----------------------------------------------------------------------------------------

    // Devolver una respuesta exitosa con el registro y sus datos relacionados.
    res.status(200).json({ record, relatedData });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error obteniendo el registro:', error);
    res.status(500).json({ message: 'Error obteniendo el registro', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR updateTableRecord -------------------------------
// ----------------------------------------------------------------------------------------

// Controlador updateTableRecord (reemplaza el que ya tienes)
exports.updateTableRecord = async (req, res) => {
  const { table_name, record_id } = req.params;
  const updatedData = req.body;
  const user_id = req.user.id; // ID del usuario autenticado

  try {
    if (!table_name.startsWith('provider_') && !table_name.startsWith('inscription_')) {
      return res.status(400).json({ message: 'Nombre de tabla inválido para este controlador.' });
    }

    // Obtener el registro antes de actualizar
    const [oldRecord] = await sequelize.query(
      `SELECT * FROM "${table_name}" WHERE id = :record_id`,
      {
        replacements: { record_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!oldRecord) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    const fieldsQuery = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = LOWER(?)`,
      {
        replacements: [table_name],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const fields = Array.isArray(fieldsQuery) ? fieldsQuery.map((field) => field.column_name) : [];

    if (fields.length === 0) {
      return res.status(500).json({ message: 'No se pudieron obtener los campos de la tabla.' });
    }

    const filteredData = {};
    for (const key in updatedData) {
      if (fields.includes(key) && updatedData[key] !== undefined && updatedData[key] !== null) {
        filteredData[key] = updatedData[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar.' });
    }

    const fieldNames = Object.keys(filteredData);
    const fieldValues = Object.values(filteredData);

    const setClause = fieldNames
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');

    const query = `
      UPDATE "${table_name}"
      SET ${setClause}
      WHERE id = $${fieldNames.length + 1}
      RETURNING *
    `;

    const [result] = await sequelize.query(query, {
      bind: [...fieldValues, record_id],
      type: sequelize.QueryTypes.UPDATE,
    });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado después de la actualización.' });
    }

    const newRecord = result[0];

    // Registrar cambios en el historial
    for (const key of Object.keys(filteredData)) {
      if (String(oldRecord[key]) !== String(newRecord[key])) {
        await insertHistory(
          table_name,
          record_id,
          user_id,
          'update',
          key,
          oldRecord[key],
          newRecord[key],
          `Campo ${key} actualizado`
        );
      }
    }

    res.status(200).json({ message: 'Registro actualizado con éxito', record: newRecord });
  } catch (error) {
    console.error('Error actualizando el registro:', error);
    res.status(500).json({ message: 'Error actualizando el registro', error: error.message });
  }
};


// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR updatePiRecord -----------------------------------
// ----------------------------------------------------------------------------------------

exports.updatePiRecord = async (req, res) => {
  const { table_name, record_id } = req.params;
  const updatedData = req.body;
  const userId = req.user.id; // Como está protegido por authenticateJWT, req.user debería existir

  try {
    if (!table_name.startsWith('pi_')) {
      return res.status(400).json({ message: 'Nombre de tabla inválido para este controlador.' });
    }

    // Obtener el registro antes de actualizar
    const oldRecordQuery = `
      SELECT * FROM "${table_name}" WHERE id = :record_id
    `;
    const [oldRecord] = await sequelize.query(oldRecordQuery, {
      replacements: { record_id },
      type: sequelize.QueryTypes.SELECT,
    });

    if (!oldRecord) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    // Obtener columnas válidas
    const fieldsQueryResult = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = LOWER(?)`,
      {
        replacements: [table_name],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const fields = fieldsQueryResult.map((field) => field.column_name);

    if (fields.length === 0) {
      console.error('Error: No se encontraron campos válidos en la tabla:', table_name);
      return res.status(500).json({ message: 'No se pudieron obtener los campos de la tabla.' });
    }

    const filteredData = {};
    for (const key in updatedData) {
      // Excluir el campo 'id' ya que es la clave primaria y no debe actualizarse
      if (fields.includes(key) && updatedData[key] !== undefined && updatedData[key] !== null && key !== 'id') {
        filteredData[key] = updatedData[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron campos válidos para actualizar.' });
    }

    const fieldNames = Object.keys(filteredData);
    const fieldValues = Object.values(filteredData);

    const setClause = fieldNames
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');

    const query = `
      UPDATE "${table_name}"
      SET ${setClause}
      WHERE id = $${fieldNames.length + 1}
      RETURNING *
    `;

    const [result] = await sequelize.query(query, {
      bind: [...fieldValues, record_id],
      type: sequelize.QueryTypes.UPDATE,
    });

    if (result.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado después de la actualización.' });
    }

    const newRecord = result[0];

    // Registrar cambios en el historial
    for (const key of fieldNames) {
      const oldValue = oldRecord[key] !== undefined ? oldRecord[key] : null;
      const newValue = newRecord[key] !== undefined ? newRecord[key] : null;
      if (String(oldValue) !== String(newValue)) {
        await insertHistory(
          table_name,
          record_id,
          userId,
          'update',
          key,
          oldRecord[key],
          newRecord[key],
          `Campo ${key} actualizado`
        );
      }
    }

    res.status(200).json({ message: 'Registro actualizado con éxito', record: newRecord });
  } catch (error) {
    console.error('Error actualizando el registro (pi_):', error);
    res.status(500).json({ message: 'Error actualizando el registro', error: error.message });
  }
};




// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR updatePrincipalStatus ----------------------------
// ----------------------------------------------------------------------------------------

exports.updatePrincipalStatus = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  // Extrae 'is_primary' del cuerpo de la solicitud.
  const { table_name } = req.params;
  const { is_primary } = req.body;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------------- VALIDAR DATOS DE ENTRADA --------------------------------------
    // ----------------------------------------------------------------------------------------

    // Verificar que se haya proporcionado un nombre de tabla.
    if (!table_name) {
      return res.status(400).json({ message: 'El nombre de la tabla es requerido' });
    }

    // Verificar que el valor de 'is_primary' sea un booleano (true o false).
    if (typeof is_primary !== 'boolean') {
      return res.status(400).json({
        message: 'El valor de is_primary debe ser booleano (true o false)',
      });
    }

    // ----------------------------------------------------------------------------------------
    // ---------------------- BUSCAR LA TABLA EN TablesMetadata --------------------------------
    // ----------------------------------------------------------------------------------------

    // Buscar el registro de la tabla en la tabla de metadata 'TablesMetadata'.
    const tableMetadata = await TablesMetadata.findOne({
      where: { table_name },
    });

    // Si la tabla no se encuentra en la metadata, devolver un error 404.
    if (!tableMetadata) {
      return res.status(404).json({
        message: 'Tabla no encontrada en TablesMetadata',
      });
    }

    // ----------------------------------------------------------------------------------------
    // ------------------------- ACTUALIZAR EL ESTADO 'is_primary' -----------------------------
    // ----------------------------------------------------------------------------------------

    // Actualizar el estado 'is_primary' de la tabla con el valor proporcionado.
    tableMetadata.is_primary = is_primary;

    // Guardar los cambios en la base de datos.
    await tableMetadata.save();

    // Responder con un mensaje de éxito indicando que se actualizó el estado de 'is_primary'.
    res.status(200).json({
      message: `Estado de principal actualizado para ${table_name}`,
    });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error actualizando el estado de principal:', error);
    res.status(500).json({
      message: 'Error actualizando el estado de principal',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR bulkUpdateRecords ------------------------------
// ----------------------------------------------------------------------------------------

exports.bulkUpdateRecords = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  // Extrae 'recordIds' y 'updates' del cuerpo de la solicitud.
  const { table_name } = req.params;
  const { recordIds, updates } = req.body;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------------ DEFINIR O VALIDAR EL MODELO DE LA TABLA -----------------------
    // ----------------------------------------------------------------------------------------

    // Verificar si el modelo de la tabla ya está definido en Sequelize.
    let Table;
    if (sequelize.isDefined(table_name)) {
      // Si el modelo ya está definido, lo reutiliza.
      Table = sequelize.model(table_name);
    } else {
      // Si el modelo no está definido, se define dinámicamente usando la estructura de la tabla.
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table_name}'
        AND table_schema = 'public'
      `);

      // Si no se encuentran columnas para la tabla, devolver un error 404.
      if (columns.length === 0) {
        return res.status(404).json({
          message: `No se encontraron columnas para la tabla ${table_name}`,
        });
      }

      // Mapeo de tipos de datos válidos de Sequelize.
      const validTypes = {
        varchar: Sequelize.STRING,
        'character varying': Sequelize.STRING,
        text: Sequelize.TEXT,
        integer: Sequelize.INTEGER,
        bigint: Sequelize.BIGINT,
        boolean: Sequelize.BOOLEAN,
        date: Sequelize.DATE,
      };

      // Construir la definición de la tabla a partir de los tipos de columnas obtenidas.
      const tableColumns = columns.reduce((acc, column) => {
        const sequelizeType = validTypes[column.data_type.toLowerCase()];
        if (sequelizeType) {
          acc[column.column_name] = {
            type: sequelizeType,
            allowNull: true,
          };

          // Marcar la columna 'id' como clave primaria si aplica.
          if (column.column_name === 'id') {
            acc[column.column_name].primaryKey = true;
            acc[column.column_name].autoIncrement = true;
          }
        }
        return acc;
      }, {});

      // Definir el modelo de la tabla dinámicamente.
      Table = sequelize.define(table_name, tableColumns, {
        timestamps: false,
        freezeTableName: true,
      });
    }

    // ----------------------------------------------------------------------------------------
    // -------------------------- ACTUALIZAR MÚLTIPLES REGISTROS -------------------------------
    // ----------------------------------------------------------------------------------------

    // Utiliza el método 'update' de Sequelize para actualizar los registros.
    // 'updates' contiene los campos y valores a actualizar.
    // 'where' especifica los registros a actualizar, filtrando por 'id'.
    await Table.update(updates, {
      where: {
        id: recordIds,
      },
    });

    // Responder con un mensaje de éxito indicando que los registros se actualizaron correctamente.
    res.status(200).json({ message: 'Registros actualizados con éxito' });

  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error actualizando registros:', error);
    res.status(500).json({
      message: 'Error actualizando registros',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR getFieldOptions ---------------------------------
// ----------------------------------------------------------------------------------------

exports.getFieldOptions = async (req, res) => {
  // Extrae 'table_name' y 'field_name' de los parámetros de la solicitud (URL).
  const { table_name, field_name } = req.params;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------------- VERIFICAR SI EL CAMPO ES UNA CLAVE FORÁNEA --------------------
    // ----------------------------------------------------------------------------------------

    // Realiza una consulta a 'information_schema' para verificar si el 'field_name' en 'table_name'
    // es una clave foránea, y en caso afirmativo, obtiene la tabla y columna relacionada.
    const [foreignKeyInfo] = await sequelize.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS related_table,
        ccu.column_name AS related_column
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = '${table_name}'
        AND kcu.column_name = '${field_name}'
    `);

    // Si 'foreignKeyInfo' contiene resultados, significa que el campo es una clave foránea.
    if (foreignKeyInfo.length > 0) {
      // Obtener el nombre de la tabla relacionada desde los resultados de la consulta.
      const relatedTableName = foreignKeyInfo[0].related_table;

      // ----------------------------------------------------------------------------------------
      // ------------------- OBTENER REGISTROS DE LA TABLA RELACIONADA ---------------------------
      // ----------------------------------------------------------------------------------------

      // Obtener todos los registros de la tabla relacionada.
      const [relatedRecords] = await sequelize.query(`SELECT * FROM "${relatedTableName}"`);

      // Mapeo de los registros para generar una lista de opciones.
      const options = relatedRecords.map(record => ({
        value: record.id,
        label: record.nombre || record.name || record.title || record.descripcion || record.Estado || record.id.toString(),
      }));

      // Responder con las opciones en formato JSON.
      return res.status(200).json({ options });
    }

    // Si no se encuentran resultados, responder con un error 400.
    res.status(400).json({ message: 'No se encontraron opciones para este campo' });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error obteniendo opciones del campo:', error);
    res.status(500).json({
      message: 'Error obteniendo opciones del campo',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR uploadFile -------------------------------------
// ----------------------------------------------------------------------------------------

// Controlador uploadFile
exports.uploadFile = async (req, res) => {
  const { table_name, record_id } = req.params;
  const { fileName, caracterizacion_id, source, user_id } = req.body;
  const finalUserId = user_id || 0; 

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    let finalRecordId = record_id;
    let finalFileName = fileName || req.file.originalname;
    let gcsPath;

    if (table_name.startsWith('pi_')) {
      if (!caracterizacion_id) {
        return res.status(400).json({
          message: 'El ID de caracterización es requerido para tablas pi_',
        });
      }
      finalRecordId = caracterizacion_id;
      gcsPath = `${table_name}/${caracterizacion_id}/${finalFileName}`;
    } else {
      gcsPath = `${table_name}/${record_id}/${finalFileName}`;
    }

    // Sube el archivo temporal a GCS
    let gcsDestination;
    try {
      gcsDestination = await uploadFileToGCS(req.file.path, gcsPath);
    } catch (gcsError) {
      return res.status(500).json({
        message: 'Error subiendo el archivo a Google Cloud Storage',
        error: gcsError.message || gcsError,
      });
    }

    // Borra el archivo temporal local
    try {
      fs.unlinkSync(req.file.path);
    } catch (fsError) {
      // Continuar aunque falle la eliminación del archivo temporal
    }

    // Guarda la ruta de GCS en la base de datos (no la URL pública)
    const newFile = await File.create({
      record_id: finalRecordId,
      table_name,
      name: finalFileName,
      file_path: gcsDestination, // Guardamos la ruta de GCS, no la URL
      source: source || 'unknown',
    });

    // Extraer formulacion_id del nombre del archivo si existe
    let formulacion_id = null;
    const match = finalFileName.match(/_formulacion_(\d+)/);
    if (match) {
      formulacion_id = parseInt(match[1], 10);
    }

    // Insertar en el historial con el formulacion_id en el fieldName si existe
    await insertHistory(
      table_name,
      finalRecordId,
      finalUserId,
      'upload_file',
      formulacion_id ? `Archivo (formulacion_id:${formulacion_id})` : 'Archivo',
      null,
      newFile.name,
      `Se subió el archivo: ${newFile.name}`
    );

    res.status(200).json({
      message: 'Archivo subido exitosamente a Google Cloud Storage',
      file: newFile,
      url: gcsDestination,
    });
  } catch (error) {
    console.error('Error subiendo el archivo:', error);
    res.status(500).json({
      message: 'Error subiendo el archivo',
      error: error.message,
    });
  }
};




// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR getFiles (modificado) -------------------------
// ----------------------------------------------------------------------------------------

// Controlador getFiles (sin cambios)
exports.getFiles = async (req, res) => {
  const { table_name, record_id } = req.params;
  const { source, caracterizacion_id } = req.query;

  try {
    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_') &&
      !table_name.startsWith('kit_') &&
      !table_name.startsWith('master_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    let finalRecordId = record_id;

    if (table_name.startsWith('pi_')) {
      finalRecordId = caracterizacion_id || record_id;
    }

    const whereClause = {
      record_id: finalRecordId,
      table_name: table_name,
    };

    if (source) {
      whereClause.source = source;
    }

    const files = await File.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    // Generar una URL firmada para cada archivo con un tiempo de expiración más largo (1 hora)
    const filesWithUrls = await Promise.all(files.map(async (file) => {
      try {
        // Extraer el path relativo en el bucket desde file_path
        let destination = file.file_path;
        const bucketUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/`;
        if (destination.startsWith(bucketUrl)) {
          destination = destination.slice(bucketUrl.length);
        }
        
        // Generar URL firmada con tiempo de expiración de 1 hora (3600 segundos)
        const signedUrl = await getSignedUrlFromGCS(destination, 3600);
        
        return {
          id: file.id,
          name: file.name,
          url: signedUrl,
          cumple: file.cumple,
          'descripcion cumplimiento': file['descripcion cumplimiento'],
        };
      } catch (error) {
        console.error(`Error generando URL firmada para archivo ${file.name}:`, error);
        return {
          id: file.id,
          name: file.name,
          url: null,
          cumple: file.cumple,
          'descripcion cumplimiento': file['descripcion cumplimiento'],
        };
      }
    }));

    res.status(200).json({ files: filesWithUrls });
  } catch (error) {
    console.error('Error obteniendo los archivos:', error);
    res.status(500).json({
      message: 'Error obteniendo los archivos',
      error: error.message,
    });
  }
};






// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR downloadZip ------------------------------------
// ----------------------------------------------------------------------------------------

exports.downloadZip = (req, res) => {
  // Extrae 'table_name' y 'record_id' de los parámetros de la solicitud (URL).
  const { table_name, record_id } = req.params;

  // ----------------------------------------------------------------------------------------
  // ----------------- VALIDAR QUE EL NOMBRE DE LA TABLA TENGA UN PREFIJO VÁLIDO -------------
  // ----------------------------------------------------------------------------------------

  // Verificar que el nombre de la tabla comience con 'inscription_', 'provider_', 'pi_', 'kit_' o 'master_'.
  // Si no cumple con este criterio, devolver un error 400.
  if (
    !table_name.startsWith('inscription_') &&
    !table_name.startsWith('provider_') &&
    !table_name.startsWith('pi_') &&
    !table_name.startsWith('kit_') &&
    !table_name.startsWith('master_')
  ) {
    return res.status(400).json({ message: 'Nombre de tabla inválido' });
  }

  // ----------------------------------------------------------------------------------------
  // ---------------------- DEFINIR LA RUTA A LA CARPETA DE ARCHIVOS -------------------------
  // ----------------------------------------------------------------------------------------

  // Construir la ruta a la carpeta donde están almacenados los archivos.
  const folderPath = path.join('uploads', table_name, record_id);

  // Verificar si la carpeta existe.
  if (!fs.existsSync(folderPath)) {
    // Si la carpeta no existe, devolver un error 404 indicando que no se encontraron archivos.
    return res.status(404).json({ message: 'No se encontraron archivos para este ID' });
  }

  // ----------------------------------------------------------------------------------------
  // ------------------------ CONFIGURAR DESCARGA DEL ARCHIVO ZIP ----------------------------
  // ----------------------------------------------------------------------------------------

  // Definir el nombre del archivo ZIP que se generará.
  const zipName = `${table_name}_${record_id}_archivos.zip`;

  // Configurar la respuesta HTTP para indicar que el contenido es un archivo adjunto (ZIP).
  res.setHeader('Content-Disposition', `attachment; filename=${zipName}`);
  res.setHeader('Content-Type', 'application/zip');

  // ----------------------------------------------------------------------------------------
  // ------------------------------ CREAR EL ARCHIVO ZIP -------------------------------------
  // ----------------------------------------------------------------------------------------

  // Crear un objeto 'archiver' para generar el archivo ZIP.
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Manejar posibles errores durante la creación del archivo ZIP.
  archive.on('error', (err) => {
    throw err; // Lanza el error para ser capturado por el middleware de errores.
  });

  // Enlazar la salida del archivo ZIP a la respuesta HTTP, para que el ZIP se descargue directamente.
  archive.pipe(res);

  // Agregar todos los archivos de la carpeta al archivo ZIP.
  // El segundo parámetro 'false' evita que se incluyan rutas relativas de la carpeta en el ZIP.
  archive.directory(folderPath, false);

  // Finalizar el proceso de creación del archivo ZIP, indicando que no se agregarán más archivos.
  archive.finalize();
};


// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR deleteFile -------------------------------------
// ----------------------------------------------------------------------------------------

// Controlador deleteFile
exports.deleteFile = async (req, res) => {
  const { file_id, record_id } = req.params;

  try {
    const file = await File.findByPk(file_id);

    if (!file) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    if (
      !file.table_name.startsWith('inscription_') &&
      !file.table_name.startsWith('provider_') &&
      !file.table_name.startsWith('pi_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    const filePath = path.join(__dirname, '..', '..', file.file_path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await File.destroy({ where: { id: file_id, record_id: record_id } });

    // Extraer formulacion_id del nombre del archivo si existe
    let formulacion_id = null;
    const match = file.name.match(/_formulacion_(\d+)/);
    if (match) {
      formulacion_id = parseInt(match[1], 10);
    }

    // Obtener user_id (desde req.body o req.user)
    const userId = req.body.user_id || (req.user && req.user.id) || null;

    await insertHistory(
      file.table_name,
      record_id,
      userId,
      'delete_file',
      formulacion_id ? `Archivo (formulacion_id:${formulacion_id})` : 'Archivo',
      file.name,
      null,
      `Se eliminó el archivo: ${file.name}`
    );

    res.status(200).json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando el archivo:', error);
    res.status(500).json({
      message: 'Error eliminando el archivo',
      error: error.message,
    });
  }
};



// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR downloadMultipleZip ----------------------------
// ----------------------------------------------------------------------------------------

exports.downloadMultipleZip = async (req, res) => {
  // Extrae 'tables' y 'recordIds' del cuerpo de la solicitud.
  const { tables, recordIds } = req.body;

  try {
    // ----------------------------------------------------------------------------------------
    // ------------------- VALIDAR QUE 'tables' Y 'recordIds' SEAN ARRAYS ----------------------
    // ----------------------------------------------------------------------------------------

    // Verifica que 'tables' y 'recordIds' sean arrays.
    // Si no lo son, devuelve un error 400 indicando que deben ser arrays.
    if (!Array.isArray(tables) || !Array.isArray(recordIds)) {
      return res.status(400).json({ message: 'Las tablas y los IDs deben ser arrays' });
    }

    // ----------------------------------------------------------------------------------------
    // ------------------------------ CREAR EL ARCHIVO ZIP ------------------------------------
    // ----------------------------------------------------------------------------------------

    // Crear un archivo ZIP utilizando 'archiver' con compresión máxima (nivel 9).
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Configurar la respuesta HTTP para indicar que el contenido es un archivo adjunto (ZIP).
    res.setHeader('Content-Disposition', `attachment; filename=archivos_seleccionados.zip`);
    res.setHeader('Content-Type', 'application/zip');

    // Enlazar el archivo ZIP a la respuesta HTTP para que se descargue directamente.
    archive.pipe(res);

    // ----------------------------------------------------------------------------------------
    // ---------------------- ITERAR SOBRE CADA TABLA Y ID PARA AGREGAR ARCHIVOS --------------
    // ----------------------------------------------------------------------------------------

    // Iterar sobre cada nombre de tabla y cada 'record_id' proporcionado.
    for (const table_name of tables) {
      for (const record_id of recordIds) {
        // Verificar que el nombre de la tabla tenga un prefijo válido.
        if (
          !table_name.startsWith('inscription_') &&
          !table_name.startsWith('provider_') &&
          !table_name.startsWith('pi_')
        ) {
          // console.log(`Nombre de tabla inválido: ${table_name}, se omite`);
          continue; // Omite tablas con nombres no válidos.
        }

        // ----------------------------------------------------------------------------------------
        // ----------------------- RUTA A LA CARPETA DE ARCHIVOS Y VERIFICACIÓN -------------------
        // ----------------------------------------------------------------------------------------

        // Construir la ruta a la carpeta donde se almacenan los archivos para la tabla e ID actual.
        const folderPath = path.join('uploads', table_name, record_id);

        // Comprobar si la carpeta existe.
        if (fs.existsSync(folderPath)) {
          // Si la carpeta existe, agregar todos los archivos de esta carpeta al ZIP.
          // Se incluirán dentro de una carpeta en el ZIP con la estructura '{table_name}/{record_id}'.
          archive.directory(folderPath, `${table_name}/${record_id}`);
        } else {
          // Si la carpeta no existe, registrar un mensaje en la consola indicando que no se encontraron archivos.
          // console.log(`No se encontraron archivos para ${table_name} con ID ${record_id}`);
        }
      }
    }

    // ----------------------------------------------------------------------------------------
    // ---------------------------- FINALIZAR EL ARCHIVO ZIP ----------------------------------
    // ----------------------------------------------------------------------------------------

    // Finalizar el proceso de creación del archivo ZIP, indicando que no se agregarán más archivos.
    await archive.finalize();
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error al crear el archivo ZIP:', error);
    res.status(500).json({
      message: 'Error al crear el archivo ZIP',
      error: error.message,
    });
  }
};


// ----------------------------------------------------------------------------------------
// ------------------------ CONTROLADOR getActiveCaracterizacionRecords -------------------
// ----------------------------------------------------------------------------------------

exports.getActiveCaracterizacionRecords = async (req, res) => {
  try {
    // ----------------------------------------------------------------------------------------
    // ---------- CONSULTAR EL NOMBRE REAL DE LA COLUMNA 'estado' INDEPENDIENTE DE MAYÚSCULAS ---
    // ----------------------------------------------------------------------------------------

    // Realiza una consulta en la base de datos para obtener el nombre exacto de la columna 'estado'.
    // Esto es útil si la columna podría tener mayúsculas o minúsculas en su nombre.
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inscription_caracterizacion'
        AND column_name ILIKE 'estado'
    `);

    // Si no se encuentra una columna llamada 'estado' (independiente de mayúsculas), devuelve un error 400.
    if (columns.length === 0) {
      return res.status(400).json({
        message: 'La columna estado o Estado no existe en la tabla inscription_caracterizacion',
      });
    }

    // Guarda el nombre exacto de la columna 'estado' para usarlo en la consulta posterior.
    const estadoColumn = columns[0].column_name;

    // ----------------------------------------------------------------------------------------
    // -------------------- CONSULTAR REGISTROS CON ESTADO 7 -------------------------------
    // ----------------------------------------------------------------------------------------

    // Realiza una consulta para obtener todos los registros de la tabla 'inscription_caracterizacion'
    // donde la columna 'estado' (o su equivalente exacto) tiene un valor de 7.
    const [records] = await sequelize.query(
      `
      SELECT *
      FROM inscription_caracterizacion
      WHERE "${estadoColumn}" IN (7)
      `
    );

    // Responde con los registros obtenidos.
    res.status(200).json(records);
  } catch (error) {
    // Captura cualquier error que ocurra durante la operación y devuelve un mensaje de error.
    console.error('Error obteniendo los registros de caracterización:', error);
    res.status(500).json({
      message: 'Error obteniendo los registros de caracterización',
    });
  }
};

// ----------------------------------------------------------------------------------------
// ---------------------------- CONTROLADOR createTableRecord -----------------------------
// ----------------------------------------------------------------------------------------

// controlador de impulso local: pi_diagnostico_cap

exports.createTableRecord = async (req, res) => {
  const { table_name } = req.params;
  const data = req.body;

  // Validar que la tabla empiece con pi_
  if (!table_name.startsWith('pi_')) {
    return res.status(400).json({ message: 'Nombre de tabla inválido' });
  }

  // Asegurar que llegue user_id para el historial
  const userId = data.user_id;
  if (!userId) {
    return res.status(400).json({
      message: 'Falta user_id en la petición para el historial.'
    });
  }

  try {
    // 1. OBTENER CAMPOS DE LA TABLA
    const fieldsQueryResult = await sequelize.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER(?)`,
      {
        replacements: [table_name],
        type: sequelize.QueryTypes.SELECT
      }
    );
    const fields = fieldsQueryResult.map((field) => field.column_name).filter(Boolean);

    if (fields.length === 0) {
      return res.status(500).json({
        message: 'No se pudieron obtener los campos de la tabla.'
      });
    }

    // 2. FILTRAR DATOS, ignorando user_id (que es para historial)
    const filteredData = {};
    for (const key in data) {
      if (
        key !== 'user_id' &&
        fields.includes(key) &&
        data[key] !== undefined &&
        data[key] !== null
      ) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        message: 'No se proporcionaron campos válidos para crear el registro.'
      });
    }

    // 3. LÓGICA ESPECIAL PARA ALGUNAS TABLAS
    // ------------------------------------------------------------------
    if (table_name === 'pi_propuesta_mejora' || table_name === 'pi_ejecucion' || table_name === 'pi_activos') {
      // Siempre crear un nuevo registro sin lógica de actualización (para pi_propuesta_mejora, pi_ejecucion, pi_activos)
      const insertFields = Object.keys(filteredData).map((f) => `"${f}"`).join(', ');
      const insertValues = Object.keys(filteredData).map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO "${table_name}" (${insertFields})
        VALUES (${insertValues})
        RETURNING *
      `;

      const [newRecord] = await sequelize.query(insertQuery, {
        bind: Object.values(filteredData),
        type: sequelize.QueryTypes.INSERT
      });

      const createdRecord = newRecord[0];

      // Registrar en historial: cada campo creado con oldValue = null
      for (const key of Object.keys(filteredData)) {
        await insertHistory(
          table_name,
          createdRecord.id,
          userId,
          'create',
          key,
          null,
          createdRecord[key],
          `Campo ${key} creado`
        );
      }

      return res.status(201).json({
        message: `Registro creado con éxito (${table_name})`,
        record: createdRecord,
      });
    }

    // ──────────────────────────────────────────────────────────────
    // NUEVO CASO: pi_encuesta_salida - ACTUALIZAR O INSERTAR
    // ──────────────────────────────────────────────────────────────
    else if (table_name === 'pi_encuesta_salida') {
      // Buscar si existe un registro con el mismo caracterizacion_id, componente y pregunta
      const findQuery = `
        SELECT id FROM "${table_name}"
        WHERE caracterizacion_id = $1
        AND componente = $2
        AND pregunta = $3
      `;

      const [existingRecord] = await sequelize.query(findQuery, {
        bind: [filteredData.caracterizacion_id, filteredData.componente, filteredData.pregunta],
        type: sequelize.QueryTypes.SELECT
      });

      if (existingRecord) {
        // Actualizar registro existente
        const updateFields = Object.keys(filteredData)
          .map((f, i) => `"${f}" = $${i + 1}`)
          .join(', ');

        const updateQuery = `
          UPDATE "${table_name}"
          SET ${updateFields}
          WHERE id = $${Object.keys(filteredData).length + 1}
          RETURNING *
        `;

        const [updatedRecord] = await sequelize.query(updateQuery, {
          bind: [...Object.values(filteredData), existingRecord.id],
          type: sequelize.QueryTypes.UPDATE
        });

        // Registrar en historial: cada campo actualizado
        for (const key of Object.keys(filteredData)) {
          await insertHistory(
            table_name,
            existingRecord.id,
            userId,
            'update',
            key,
            null, // No tenemos el valor anterior
            filteredData[key],
            `Campo ${key} actualizado`
          );
        }

        return res.status(200).json({
          message: `Registro actualizado con éxito (${table_name})`,
          record: updatedRecord[0],
        });
      } else {
        // Crear nuevo registro si no existe
        const insertFields = Object.keys(filteredData).map((f) => `"${f}"`).join(', ');
        const insertValues = Object.keys(filteredData).map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO "${table_name}" (${insertFields})
          VALUES (${insertValues})
          RETURNING *
        `;

        const [newRecord] = await sequelize.query(insertQuery, {
          bind: Object.values(filteredData),
          type: sequelize.QueryTypes.INSERT
        });
        const createdRecord = newRecord[0];

        // Registrar en historial: cada campo creado
        for (const key of Object.keys(filteredData)) {
          await insertHistory(
            table_name,
            createdRecord.id,
            userId,
            'create',
            key,
            null,
            createdRecord[key],
            `Campo ${key} creado`
          );
        }

        return res.status(201).json({
          message: `Registro creado con éxito (${table_name})`,
          record: createdRecord,
        });
      }
    }

    // ──────────────────────────────────────────────────────────────
    // LÓGICA ORIGINAL PARA OTRAS TABLAS PI_
    // ──────────────────────────────────────────────────────────────
    else {
      // Buscar si existe un registro existente para la tabla
      let existingRecordId = null;

      // Caso pi_formulacion y pi_formulacion_prov: busca por caracterizacion_id + rel_id_prov
      if (table_name === 'pi_formulacion' || table_name === 'pi_formulacion_prov') {
        if (filteredData.caracterizacion_id && filteredData.rel_id_prov) {
          const checkQuery = `
            SELECT id FROM "${table_name}" WHERE caracterizacion_id = :caracterizacion_id AND rel_id_prov = :rel_id_prov
          `;
          const existingRecords = await sequelize.query(checkQuery, {
            replacements: {
              caracterizacion_id: filteredData.caracterizacion_id,
              rel_id_prov: filteredData.rel_id_prov
            },
            type: sequelize.QueryTypes.SELECT,
          });

          if (existingRecords && existingRecords.length > 0) {
            existingRecordId = existingRecords[0].id;
          }
        }
      } else {
        // Para el resto de tablas pi_ => busca por caracterizacion_id
        if (filteredData.caracterizacion_id) {
          const checkQuery = `
            SELECT id FROM "${table_name}" WHERE caracterizacion_id = :caracterizacion_id
          `;
          const existingRecords = await sequelize.query(checkQuery, {
            replacements: { caracterizacion_id: filteredData.caracterizacion_id },
            type: sequelize.QueryTypes.SELECT,
          });

          if (existingRecords && existingRecords.length > 0) {
            existingRecordId = existingRecords[0].id;
          }
        }
      }

      if (existingRecordId) {
        // Actualizar registro existente
        const oldRecordQuery = `
          SELECT * FROM "${table_name}" WHERE id = :record_id
        `;
        const [oldRecord] = await sequelize.query(oldRecordQuery, {
          replacements: { record_id: existingRecordId },
          type: sequelize.QueryTypes.SELECT,
        });

        const fieldNames = Object.keys(filteredData);
        const fieldValues = Object.values(filteredData);
        const setClause = fieldNames.map((f, i) => `"${f}" = $${i + 1}`).join(', ');

        const updateQuery = `
          UPDATE "${table_name}"
          SET ${setClause}
          WHERE id = $${fieldNames.length + 1}
          RETURNING *
        `;
        const [updatedRecord] = await sequelize.query(updateQuery, {
          bind: [...fieldValues, existingRecordId],
          type: sequelize.QueryTypes.UPDATE,
        });

        const newRecord = updatedRecord[0];

        // Registrar cambios en el historial
        for (const key of fieldNames) {
          const oldValue =
            oldRecord[key] !== null && oldRecord[key] !== undefined
              ? String(oldRecord[key])
              : null;
          const newValue =
            newRecord[key] !== null && newRecord[key] !== undefined
              ? String(newRecord[key])
              : null;

          if (oldValue !== newValue) {
            await insertHistory(
              table_name,
              existingRecordId,
              userId,
              'update',
              key,
              oldRecord[key],
              newRecord[key],
              `Campo ${key} actualizado`
            );
          }
        }

        return res.status(200).json({
          message: 'Registro actualizado con éxito',
          record: newRecord,
        });
      }

      // Si no existe, se crea
      const insertFields = Object.keys(filteredData)
        .map((field) => `"${field}"`)
        .join(', ');
      const insertValues = Object.keys(filteredData)
        .map((_, i) => `$${i + 1}`)
        .join(', ');

      const insertQuery = `
        INSERT INTO "${table_name}" (${insertFields})
        VALUES (${insertValues})
        RETURNING *
      `;
      const [newRecord] = await sequelize.query(insertQuery, {
        bind: Object.values(filteredData),
        type: sequelize.QueryTypes.INSERT
      });
      const createdRecord = newRecord[0];

      // Registrar historial (creación)
      for (const key of Object.keys(filteredData)) {
        await insertHistory(
          table_name,
          createdRecord.id,
          userId,
          'create',
          key,
          null,
          createdRecord[key],
          `Campo ${key} creado`
        );
      }

      return res.status(201).json({
        message: 'Registro creado con éxito',
        record: createdRecord,
      });
    }
  } catch (error) {
    console.error('Error creando el registro:', error);
    return res.status(500).json({
      message: 'Error creando el registro',
      error: error.message
    });
  }
};








// Guardar configuración de columnas visibles
exports.saveVisibleColumns = async (req, res) => {
  const { userId } = req.user; // Asume que el userId viene en el token
  const { table_name } = req.params;
  const { visibleColumns } = req.body;

  try {
    // Guarda o actualiza la configuración de columnas visibles para este usuario y tabla
    await UserSettings.upsert({
      userId,
      tableName: table_name,
      visibleColumns: JSON.stringify(visibleColumns),
    });

    res.status(200).json({ message: 'Configuración guardada con éxito' });
  } catch (error) {
    console.error('Error guardando configuración de columnas:', error);
    res.status(500).json({ message: 'Error guardando configuración de columnas', error: error.message });
  }
};

// Obtener configuración de columnas visibles
exports.getVisibleColumns = async (req, res) => {
  const { userId } = req.user;
  const { table_name } = req.params;

  try {
    const settings = await UserSettings.findOne({
      where: { userId, tableName: table_name },
    });

    if (settings) {
      res.status(200).json({ visibleColumns: JSON.parse(settings.visibleColumns) });
    } else {
      res.status(200).json({ visibleColumns: [] });
    }
  } catch (error) {
    console.error('Error obteniendo configuración de columnas:', error);
    res.status(500).json({ message: 'Error obteniendo configuración de columnas', error: error.message });
  }
};

// Controlador para guardar las preferencias de columnas visibles
exports.saveFieldPreferences = async (req, res) => {
  const { table_name } = req.params;
  const { visible_columns } = req.body;

  // console.log(`Guardando preferencias de columnas para la tabla: ${table_name}`);
  // console.log('Columnas visibles recibidas:', visible_columns);

  try {
    // Validar que `visible_columns` sea un array
    if (!Array.isArray(visible_columns)) {
      // console.log('Error: visible_columns no es un array');
      return res.status(400).json({ message: 'Las columnas visibles deben ser un array' });
    }

    // Buscar si ya existe una entrada para la tabla
    let preference = await FieldPreference.findOne({
      where: { table_name },
    });

    if (preference) {
      // Actualizar las columnas visibles
      preference.visible_columns = visible_columns;
      await preference.save();
      // console.log('Preferencias de columnas actualizadas exitosamente');
      return res.status(200).json({ message: 'Preferencias de columnas actualizadas exitosamente' });
    } else {
      // Crear una nueva entrada
      await FieldPreference.create({
        table_name,
        visible_columns,
      });
      // console.log('Preferencias de columnas guardadas exitosamente');
      return res.status(200).json({ message: 'Preferencias de columnas guardadas exitosamente' });
    }
  } catch (error) {
    console.error('Error guardando las preferencias de columnas:', error);
    return res.status(500).json({
      message: 'Error guardando las preferencias de columnas',
      error: error.message,
    });
  }
};

// Controlador para obtener las preferencias de columnas visibles
exports.getFieldPreferences = async (req, res) => {
  const { table_name } = req.params;

  // console.log(`Obteniendo preferencias de columnas para la tabla: ${table_name}`);

  try {
    const preference = await FieldPreference.findOne({
      where: { table_name },
    });

    if (preference) {
      // console.log('Preferencias de columnas encontradas:', preference.visible_columns);
      return res.status(200).json({ visible_columns: preference.visible_columns });
    } else {
      // console.log('No se encontraron preferencias de columnas. Devolviendo array vacío.');
      return res.status(200).json({ visible_columns: [] });
    }
  } catch (error) {
    console.error('Error obteniendo las preferencias de columnas:', error);
    return res.status(500).json({
      message: 'Error obteniendo las preferencias de columnas',
      error: error.message,
    });
  }
};


// ----------------------------------------------------------------------------------------
// ----------------------------- CONTROLADOR createNewRecord (Crea un registro individual dentro de la tabla inscription_caracterizacion)------------------------------
// ----------------------------------------------------------------------------------------

exports.createNewRecord = async (req, res) => {
  // console.log('Solicitud recibida en createNewRecord:', req.params.table_name, req.body);
  
  const { table_name } = req.params;
  const recordData = req.body;

  try {
    // Validar que la tabla sea 'inscription_caracterizacion'
    if (table_name !== 'inscription_caracterizacion') {
      return res.status(400).json({ message: 'Operación no permitida para esta tabla' });
    }

    // Definir el modelo si no está registrado en Sequelize
    let Table;
    if (sequelize.isDefined(table_name)) {
      Table = sequelize.model(table_name);
    } else {
      // Obtener la estructura de la tabla y definir el modelo dinámicamente
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${table_name}'
        AND table_schema = 'public'
      `);

      // Verificar si se encontraron columnas para la tabla
      if (columns.length === 0) {
        return res.status(404).json({ message: `No se encontraron columnas para la tabla ${table_name}` });
      }

      // Definir los tipos de datos válidos para Sequelize
      const validTypes = {
        varchar: Sequelize.STRING,
        'character varying': Sequelize.STRING,
        text: Sequelize.TEXT,
        integer: Sequelize.INTEGER,
        bigint: Sequelize.BIGINT,
        boolean: Sequelize.BOOLEAN,
        date: Sequelize.DATE,
      };

      // Crear el modelo de la tabla basado en los tipos de datos de las columnas
      const tableColumns = columns.reduce((acc, column) => {
        const sequelizeType = validTypes[column.data_type.toLowerCase()];
        if (sequelizeType) {
          acc[column.column_name] = {
            type: sequelizeType,
            allowNull: true,
            field: column.column_name, // Asegurarse de mapear el nombre del campo correctamente
          };
          if (column.column_name === 'id') {
            acc[column.column_name].primaryKey = true;
            acc[column.column_name].autoIncrement = true;
          }
        }
        return acc;
      }, {});

      // Definir el modelo de la tabla de forma dinámica
      Table = sequelize.define(table_name, tableColumns, {
        timestamps: false,
        freezeTableName: true,
        quoteIdentifiers: true, // Asegurar que Sequelize maneje correctamente los nombres de columnas con espacios
      });
    }

    // Verificar si ya existe un registro con el mismo "Numero de identificacion" o "Correo electronico"
    const existingRecord = await Table.findOne({
      where: {
        [Sequelize.Op.or]: [
          { ['Numero de identificacion']: recordData['Numero de identificacion'] },
          { ['Correo electronico']: recordData['Correo electronico'] },
        ],
      },
    });

    if (existingRecord) {
      return res.status(400).json({
        message: 'Ya existe un registro con el mismo Número de identificación o Correo electrónico.',
      });
    }

    // Crear el registro en la tabla
    const newRecord = await Table.create(recordData);

    // Devolver la respuesta con el 'id' del nuevo registro creado
    res.status(201).json({
      message: 'Registro creado exitosamente',
      id: newRecord.id, // Asegurarse de que el 'id' esté presente en la respuesta
    });
  } catch (error) {
    console.error('Error creando el registro:', error);
    res.status(500).json({ message: 'Error creando el registro', error: error.message });
  }
};




// ----------------------------------------------------------------------------------------
// ------------------------- CONTROLADOR getRelatedData -----------------------------------
// ----------------------------------------------------------------------------------------

exports.getRelatedData = async (req, res) => {
  // Extrae 'table_name' de los parámetros de la solicitud (URL).
  const { table_name } = req.params;

  try {
    // Definir un mapeo de tipos de datos válidos para Sequelize.
    const validTypes = {
      varchar: Sequelize.STRING,
      'character varying': Sequelize.STRING,
      text: Sequelize.TEXT,
      integer: Sequelize.INTEGER,
      bigint: Sequelize.BIGINT,
      boolean: Sequelize.BOOLEAN,
      date: Sequelize.DATE,
    };

    // Obtener información sobre las claves foráneas desde 'information_schema'.
    const [fields] = await sequelize.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS related_table
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = '${table_name}'
    `);

    // Crear un objeto para almacenar los datos relacionados.
    const relatedData = {};
    const relatedCache = {}; // Nuevo caché para evitar consultas duplicadas

    for (const field of fields) {
      const relatedTableName = field.related_table;
      const foreignKeyColumn = field.column_name;

      if (relatedTableName) {
        let RelatedTable;
        if (sequelize.isDefined(relatedTableName)) {
          RelatedTable = sequelize.model(relatedTableName);
        } else {
          const [relatedColumns] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = '${relatedTableName}'
            AND table_schema = 'public'
          `);

          const relatedTableColumns = relatedColumns.reduce((acc, column) => {
            const sequelizeType = validTypes[column.data_type.toLowerCase()];
            if (sequelizeType) {
              acc[column.column_name] = { type: sequelizeType, allowNull: true };
              if (column.column_name === 'id') {
                acc[column.column_name].primaryKey = true;
                acc[column.column_name].autoIncrement = true;
              }
            }
            return acc;
          }, {});

          RelatedTable = sequelize.define(relatedTableName, relatedTableColumns, {
            timestamps: false,
            freezeTableName: true,
          });
        }

        // Si ya consultamos esta tabla, reutiliza el resultado
        if (relatedCache[relatedTableName]) {
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
          continue;
        }

        if (relatedTableName === 'users') {
          const relatedRecords = await RelatedTable.findAll({
            attributes: ['id', 'username'],
            limit: 100
          });
          relatedCache[relatedTableName] = relatedRecords.map((record) => ({
            id: record.id,
            displayValue: record.username,
          }));
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
        } else {
          const relatedRecords = await RelatedTable.findAll({
            limit: 100
          });
          let displayField = relatedRecords[0] ? Object.keys(relatedRecords[0].dataValues).find((col) => col !== 'id') : 'id';
          relatedCache[relatedTableName] = relatedRecords.map((record) => ({
            id: record.id,
            displayValue: record[displayField],
          }));
          relatedData[foreignKeyColumn] = relatedCache[relatedTableName];
        }
      }
    }

    // console.log('Related Data:', relatedData);

    // ----------------------------------------------------------------------------------------
    // ------------------ DEVOLVER LOS DATOS RELACIONADOS -------------------------------------
    // ----------------------------------------------------------------------------------------

    // Devolver una respuesta exitosa con los datos relacionados.
    res.status(200).json({ relatedData });
  } catch (error) {
    // Capturar cualquier error durante la operación y devolver un mensaje de error.
    console.error('Error obteniendo los datos relacionados:', error);
    res.status(500).json({ message: 'Error obteniendo los datos relacionados', error: error.message });
  }
};


// ----------------------------------------------------------------------------------------
// ----------------------------- CONTROLADOR getTableFields -------------------------------
// ----------------------------------------------------------------------------------------

exports.getTableFields = async (req, res) => {
  const { table_name } = req.params;

  try {
    // console.log(`Consultando campos para la tabla: ${table_name}`);

    const [fields] = await sequelize.query(`
      SELECT 
        c.column_name, 
        c.data_type,
        c.is_nullable,
        tc.constraint_type,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON LOWER(c.table_name) = LOWER(kcu.table_name)
        AND LOWER(c.column_name) = LOWER(kcu.column_name)
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND tc.constraint_type = 'FOREIGN KEY'
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE LOWER(c.table_name) = LOWER(:table_name)
        AND c.table_schema = 'public'
    `, {
      replacements: { table_name }
    });

    if (fields.length === 0) {
      return res.status(404).json({ message: `No se encontraron campos para la tabla ${table_name}` });
    }

    const fieldDataTypes = fields.map(field => {
      let mappedType;
      switch (field.data_type) {
        case 'character varying':
        case 'varchar':
          mappedType = 'VARCHAR(255)';
          break;
        case 'text':
          mappedType = 'TEXT';
          break;
        case 'integer':
          mappedType = 'INTEGER';
          break;
        case 'bigint':
          mappedType = 'BIGINT';
          break;
        case 'numeric':
        case 'decimal':
          mappedType = 'DECIMAL';
          break;
        case 'boolean':
          mappedType = 'BOOLEAN';
          break;
        case 'date':
        case 'timestamp without time zone':
          mappedType = 'DATE';
          break;
        default:
          mappedType = field.data_type.toUpperCase();
      }

      return {
        ...field,
        data_type: mappedType,
      };
    });

    res.status(200).json(fieldDataTypes);
  } catch (error) {
    console.error('Error obteniendo los campos de la tabla:', error);
    res.status(500).json({ message: 'Error obteniendo los campos de la tabla', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------------- CONTROLADOR validateField -------------------------------
// ----------------------------------------------------------------------------------------

exports.validateField = async (req, res) => {
  const { table_name } = req.params;
  const { fieldName, fieldValue } = req.body;

  try {
    // Validar que table_name y fieldName son cadenas alfanuméricas para evitar inyección SQL
    const isValidIdentifier = (str) => /^[a-zA-Z0-9_ ]+$/.test(str);

    if (!isValidIdentifier(table_name)) {
      return res.status(400).json({ error: 'Nombre de tabla inválido.' });
    }

    if (!isValidIdentifier(fieldName)) {
      return res.status(400).json({ error: 'Nombre de campo inválido.' });
    }

    // Verificar si la tabla existe en la base de datos
    const tableExistsResult = await sequelize.query(
      `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :table_name`,
      {
        replacements: { table_name },
        type: QueryTypes.SELECT,
      }
    );

    if (parseInt(tableExistsResult[0].count) === 0) {
      return res.status(400).json({ error: `La tabla '${table_name}' no existe.` });
    }

    // Verificar si el campo existe en la tabla
    const fieldExistsResult = await sequelize.query(
      `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :table_name AND column_name = :fieldName`,
      {
        replacements: { table_name, fieldName },
        type: QueryTypes.SELECT,
      }
    );

    if (parseInt(fieldExistsResult[0].count) === 0) {
      return res.status(400).json({ error: `El campo '${fieldName}' no existe en la tabla '${table_name}'.` });
    }

    // Consultar si el valor ya existe en la tabla
    const valueExistsResult = await sequelize.query(
      `SELECT COUNT(*) AS count FROM "${table_name}" WHERE "${fieldName}" = :fieldValue`,
      {
        replacements: { fieldValue },
        type: QueryTypes.SELECT,
      }
    );

    const exists = parseInt(valueExistsResult[0].count) > 0;

    res.json({ exists });
  } catch (error) {
    console.error('Error al validar el campo:', error);
    res.status(500).json({ error: 'Error al validar el campo.', details: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------------- CONTROLADOR updateFileCompliance -------------------------
// ----------------------------------------------------------------------------------------

exports.updateFileCompliance = async (req, res) => {
  const { table_name, record_id, file_id } = req.params;
  const { cumple, descripcion_cumplimiento } = req.body;

  try {
    // Validar entrada
    if (cumple === undefined || cumple === null) {
      return res.status(400).json({ error: 'El campo "cumple" es requerido' });
    }

    // Actualizar el archivo en la base de datos
    const [results] = await sequelize.query(
      `UPDATE files
       SET cumple = :cumple, "descripcion cumplimiento" = :descripcion_cumplimiento
       WHERE id = :file_id AND record_id = :record_id AND table_name = :table_name
       RETURNING id`,
      {
        replacements: {
          cumple,
          descripcion_cumplimiento,
          file_id,
          record_id,
          table_name,
        },
        type: QueryTypes.UPDATE,
      }
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado o no pertenece al registro' });
    }

    res.json({ message: 'Estado de cumplimiento actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando el cumplimiento:', error);
    res.status(500).json({ error: 'Error actualizando el cumplimiento' });
  }
};

// ----------------------------------------------------------------------------------------
// -------------------------------- CONTROLADOR deleteTableRecord -------------------------
// ----------------------------------------------------------------------------------------

exports.deleteTableRecord = async (req, res) => {
  const { table_name, record_id } = req.params;

  try {
    // Validar que el nombre de la tabla comience con 'pi_'
    if (!table_name.startsWith('pi_')) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    // Ejecutar la consulta para eliminar el registro específico
    const deleteQuery = `DELETE FROM "${table_name}" WHERE id = :record_id RETURNING *`;
    const result = await sequelize.query(deleteQuery, {
      replacements: { record_id },
      type: sequelize.QueryTypes.DELETE,
    });

    // Verificar si no se encontró el registro a eliminar
    if (result[1] === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    return res.status(200).json({ message: 'Registro eliminado con éxito' });
  } catch (error) {
    console.error('Error eliminando el registro:', error);
    res.status(500).json({ message: 'Error eliminando el registro', error: error.message });
  }
};

// ----------------------------------------------------------------------------------------
// ------------------------------ CONTROLADOR createComment -------------------------------
// ----------------------------------------------------------------------------------------

/**
 * Controlador para crear un nuevo comentario.
 * 
 * Espera recibir:
 * - En los parámetros de la ruta:
 *   - table_name: Nombre de la tabla a la que pertenece el registro.
 *   - record_id: ID del registro al que se le está dejando el comentario.
 * - En el cuerpo de la solicitud:
 *   - comment: Contenido del comentario (text, requerido).
 *   - caracterizacion_id: ID de caracterización (opcional, requerido para tablas 'pi_').
 */
exports.createComment = async (req, res) => {
  const { table_name, record_id } = req.params;
  const { comment, caracterizacion_id } = req.body;
  const user_id = req.user.id; // Obtener el ID del usuario autenticado

  // Validación de los campos requeridos
  if (!table_name || !record_id || !comment) {
    return res.status(400).json({
      message: 'Los campos table_name, record_id y comment son obligatorios.',
    });
  }

  try {
    // Validar el nombre de la tabla
    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_') &&
      !table_name.startsWith('kit_') &&
      !table_name.startsWith('master_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    // Definir el record_id final para buscar el registro
    let finalRecordId = record_id;

    // Si la tabla es 'pi_', utilizar el 'caracterizacion_id' como 'record_id'
    if (table_name.startsWith('pi_')) {
      if (!caracterizacion_id) {
        return res.status(400).json({ message: 'El ID de caracterización es requerido para tablas pi_' });
      }
      finalRecordId = caracterizacion_id;
    }

    // Verificar que el registro existe
    const [record] = await sequelize.query(
      `SELECT id FROM ${table_name} WHERE id = :record_id`,
      {
        replacements: { record_id: finalRecordId },
        type: QueryTypes.SELECT,
      }
    );

    if (!record) {
      return res.status(400).json({
        message: `No se encontró un registro con id ${finalRecordId} en la tabla ${table_name}.`,
      });
    }

    // Crear el nuevo comentario
    const newComment = await Comment.create({
      record_id: finalRecordId,
      table_name,
      user_id,
      comment,
    });

    // Insertar en el historial
    await insertHistory(
      table_name,
      finalRecordId,
      user_id,
      'add_comment',
      null,
      null,
      null,
      `Comentario agregado: ${comment}`
    );

    // Respuesta exitosa
    return res.status(201).json({
      message: 'Comentario creado con éxito.',
      comment: newComment,
    });
  } catch (error) {
    console.error('Error al crear el comentario:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al crear el comentario.',
      error: error.message,
    });
  }
};



// ----------------------------------------------------------------------------------------
// ------------------------------ CONTROLADOR getComments ---------------------------------
// ----------------------------------------------------------------------------------------

/**
 * Controlador para obtener comentarios filtrados por table_name y record_id.
 * 
 * Espera recibir:
 * - En los parámetros de la ruta:
 *   - table_name: Nombre de la tabla a la que pertenece el registro.
 *   - record_id: ID del registro del cual se quieren obtener los comentarios.
 * - En la consulta (query parameters):
 *   - caracterizacion_id: ID de caracterización (opcional, requerido para tablas 'pi_').
 */
// Controlador getComments
exports.getComments = async (req, res) => {
  const { table_name, record_id } = req.params;
  const { caracterizacion_id } = req.query;

  if (!table_name || !record_id) {
    return res.status(400).json({ message: 'Los parámetros table_name y record_id son requeridos.' });
  }

  try {
    // Validar el nombre de la tabla
    if (
      !table_name.startsWith('inscription_') &&
      !table_name.startsWith('provider_') &&
      !table_name.startsWith('pi_') &&
      !table_name.startsWith('kit_') &&
      !table_name.startsWith('master_')
    ) {
      return res.status(400).json({ message: 'Nombre de tabla inválido' });
    }

    let finalRecordId = record_id;

    if (table_name.startsWith('pi_')) {
      finalRecordId = caracterizacion_id || record_id;
    }

    const comments = await Comment.findAll({
      where: {
        record_id: finalRecordId,
        table_name: table_name,
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ comments });
  } catch (error) {
    console.error('Error obteniendo los comentarios:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al obtener los comentarios.',
      error: error.message,
    });
  }
};


//----------------- CONTROLADORES PARA EL HISTORIAL DE CAMBIOS --------------------------

// Controlador getRecordHistory
exports.getRecordHistory = async (req, res) => {
  const { table_name, record_id } = req.params;

  try {
    const history = await sequelize.query(
      `SELECT rh.*, u.username
       FROM record_history rh
       JOIN users u ON rh.user_id = u.id
       WHERE rh.table_name = :table_name AND rh.record_id = :record_id
       ORDER BY rh.created_at DESC`,
      {
        replacements: { table_name, record_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return res.status(200).json({ history });
  } catch (error) {
    console.error('Error obteniendo el historial:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al obtener el historial.',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR uploadInicialesFile -----------------------------
// ----------------------------------------------------------------------------------------

// Controlador para subir archivos de Documentos Iniciales (Empresas)
exports.uploadInicialesFile = async (req, res) => {
  const { caracterizacion_id } = req.params;
  const { documentType, fileName, user_id } = req.body;
  const finalUserId = user_id || 0;

  console.log('🔍 [uploadInicialesFile] Iniciando...');
  console.log('📋 Parámetros recibidos:', { caracterizacion_id, documentType, fileName, user_id });

  try {
    if (!req.file) {
      console.log('❌ No se subió ningún archivo');
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    if (!caracterizacion_id) {
      console.log('❌ Falta caracterizacion_id');
      return res.status(400).json({
        message: 'El ID de caracterización es requerido',
      });
    }

    if (!documentType) {
      console.log('❌ Falta documentType');
      return res.status(400).json({
        message: 'El tipo de documento es requerido',
      });
    }

    // Validar que el tipo de documento sea válido
    const validDocumentTypes = ['CC', 'RP', 'DA'];
    if (!validDocumentTypes.includes(documentType)) {
      console.log('❌ Tipo de documento inválido:', documentType);
      return res.status(400).json({
        message: 'Tipo de documento inválido. Debe ser CC, RP o DA',
      });
    }

    const finalFileName = fileName || req.file.originalname;
    console.log('📄 Nombre final del archivo:', finalFileName);

    // Generar la ruta de GCS usando la nueva estructura
    let gcsPath;
    try {
      console.log('🔄 Generando ruta GCS...');
      const { generateInicialesPath } = require('../utils/gcs');
      gcsPath = await generateInicialesPath(caracterizacion_id, documentType, finalFileName);
      console.log('✅ Ruta GCS generada:', gcsPath);
    } catch (pathError) {
      console.error('❌ Error generando ruta GCS:', pathError);
      return res.status(500).json({
        message: 'Error generando la ruta del archivo',
        error: pathError.message,
      });
    }

    // Sube el archivo temporal a GCS
    let gcsDestination;
    try {
      const { uploadFileToGCS } = require('../utils/gcs');
      gcsDestination = await uploadFileToGCS(req.file.path, gcsPath);
    } catch (gcsError) {
      return res.status(500).json({
        message: 'Error subiendo el archivo a Google Cloud Storage',
        error: gcsError.message || gcsError,
      });
    }

    // Borra el archivo temporal local
    try {
      fs.unlinkSync(req.file.path);
    } catch (fsError) {
      // Continuar aunque falle la eliminación del archivo temporal
    }

    // Guarda la ruta de GCS en la base de datos (no la URL firmada)
    const newFile = await File.create({
      record_id: caracterizacion_id,
      table_name: 'inscription_caracterizacion',
      name: finalFileName,
      file_path: gcsDestination,
      source: 'documentos_iniciales',
    });

    // Insertar en el historial
    await insertHistory(
      'inscription_caracterizacion',
      caracterizacion_id,
      finalUserId,
      'upload_iniciales_file',
      `Documento Inicial (${documentType})`,
      null,
      newFile.name,
      `Se subió el documento inicial: ${newFile.name} (Tipo: ${documentType})`
    );

    res.status(200).json({
      message: 'Documento inicial subido exitosamente',
      file: newFile,
      url: gcsDestination,
      documentType: documentType,
    });
  } catch (error) {
    console.error('Error subiendo el documento inicial:', error);
    res.status(500).json({
      message: 'Error subiendo el documento inicial',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// --------------------------- CONTROLADOR getInicialesFiles -------------------------------
// ----------------------------------------------------------------------------------------

// Controlador para obtener archivos de Documentos Iniciales
exports.getInicialesFiles = async (req, res) => {
  const { caracterizacion_id } = req.params;

  try {
    if (!caracterizacion_id) {
      return res.status(400).json({
        message: 'El ID de caracterización es requerido',
      });
    }

    // Obtener archivos de la tabla files que correspondan a documentos iniciales
    const files = await File.findAll({
      where: {
        record_id: caracterizacion_id,
        table_name: 'inscription_caracterizacion',
        source: 'documentos_iniciales',
      },
      order: [['created_at', 'DESC']],
    });

    // Generar URLs firmadas para cada archivo
    const { getSignedUrlFromGCS } = require('../utils/gcs');
    const filesWithUrls = await Promise.all(files.map(async (file) => {
      try {
        // Extraer el path relativo en el bucket desde file_path
        let destination = file.file_path;
        const bucketUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/`;
        if (destination.startsWith(bucketUrl)) {
          destination = destination.slice(bucketUrl.length);
        }
        
        // Generar URL firmada con tiempo de expiración de 1 hora
        const signedUrl = await getSignedUrlFromGCS(destination, 3600);
        
        return {
          id: file.id,
          name: file.name,
          url: signedUrl,
          documentType: extractDocumentTypeFromPath(destination),
          createdAt: file.created_at,
          cumple: file.cumple,
          'descripcion cumplimiento': file['descripcion cumplimiento'],
          source: file.source,
        };
      } catch (error) {
        console.error(`Error generando URL firmada para archivo ${file.name}:`, error);
        return {
          id: file.id,
          name: file.name,
          url: null,
          documentType: null,
          createdAt: file.created_at,
          cumple: file.cumple,
          'descripcion cumplimiento': file['descripcion cumplimiento'],
          source: file.source,
        };
      }
    }));

    res.status(200).json({ files: filesWithUrls });
  } catch (error) {
    console.error('[getInicialesFiles] Error obteniendo los archivos:', error);
    res.status(500).json({
      message: 'Error obteniendo los archivos de documentos iniciales',
      error: error.message,
    });
  }
};

// Función auxiliar para extraer el tipo de documento de la ruta
function extractDocumentTypeFromPath(path) {
  // Buscar patrones como _CC_, _RP_, _DA_ en la ruta
  const match = path.match(/_([A-Z]{2})_/);
  return match ? match[1] : null;
}

// ----------------------------------------------------------------------------------------
// ----------------------- CONTROLADOR updateInicialesFileCompliance ----------------------
// ----------------------------------------------------------------------------------------

exports.updateInicialesFileCompliance = async (req, res) => {
  const { caracterizacion_id, file_id } = req.params;
  const { cumple, descripcion_cumplimiento } = req.body;

  try {
    // Validar entrada
    if (cumple === undefined || cumple === null) {
      return res.status(400).json({ error: 'El campo "cumple" es requerido' });
    }

    // Actualizar el archivo en la base de datos
    const [results] = await sequelize.query(
      `UPDATE files
       SET cumple = :cumple, "descripcion cumplimiento" = :descripcion_cumplimiento
       WHERE id = :file_id AND record_id = :caracterizacion_id AND table_name = 'inscription_caracterizacion' AND source = 'documentos_iniciales'
       RETURNING id`,
      {
        replacements: {
          cumple,
          descripcion_cumplimiento,
          file_id,
          caracterizacion_id,
        },
        type: QueryTypes.UPDATE,
      }
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado o no pertenece al registro' });
    }

    res.json({ message: 'Estado de cumplimiento actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando el cumplimiento:', error);
    res.status(500).json({ error: 'Error actualizando el cumplimiento' });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------- CONTROLADOR deleteInicialesFile --------------------------------
// ----------------------------------------------------------------------------------------

exports.deleteInicialesFile = async (req, res) => {
  const { caracterizacion_id, file_id } = req.params;

  try {
    // Buscar el archivo en la base de datos
    const file = await File.findOne({
      where: {
        id: file_id,
        record_id: caracterizacion_id,
        table_name: 'inscription_caracterizacion',
        source: 'documentos_iniciales',
      },
    });

    if (!file) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    // Eliminar el archivo de Google Cloud Storage
    const { bucket } = require('../utils/gcs');
    let destination = file.file_path;
    const bucketUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/`;
    if (destination.startsWith(bucketUrl)) {
      destination = destination.slice(bucketUrl.length);
    }

    try {
      const gcsFile = bucket.file(destination);
      await gcsFile.delete();
    } catch (gcsError) {
      // Continuar con la eliminación de la BD aunque falle en GCS
    }

    // Eliminar el registro de la base de datos
    await File.destroy({
      where: {
        id: file_id,
        record_id: caracterizacion_id,
        table_name: 'inscription_caracterizacion',
        source: 'documentos_iniciales',
      },
    });

    // Registrar en el historial
    const userId = req.user && req.user.id ? req.user.id : null;
    await insertHistory(
      'inscription_caracterizacion',
      caracterizacion_id,
      userId,
      'delete_file',
      'Documento Inicial',
      file.name,
      null,
      `Se eliminó el documento inicial: ${file.name}`
    );

    res.status(200).json({ message: 'Documento inicial eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando el archivo:', error);
    res.status(500).json({
      message: 'Error eliminando el documento inicial',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------- CONTROLADOR getSignedUrl -------------------------------------
// ----------------------------------------------------------------------------------------

exports.getSignedUrl = async (req, res) => {
  const { file_path } = req.params;

  try {
    if (!file_path) {
      return res.status(400).json({ message: 'Ruta del archivo es requerida' });
    }

    // Decodificar la ruta del archivo
    const decodedPath = decodeURIComponent(file_path);
    
    // Generar URL firmada con tiempo de expiración de 1 hora
    const signedUrl = await getSignedUrlFromGCS(decodedPath, 3600);
    
    if (!signedUrl) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    res.status(200).json({ signedUrl });
  } catch (error) {
    console.error('Error generando URL firmada:', error);
    res.status(500).json({
      message: 'Error generando URL firmada',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ----------------------- CONTROLADOR uploadAnexosV2File --------------------------------
// ----------------------------------------------------------------------------------------

exports.uploadAnexosV2File = async (req, res) => {
  const { table_name, record_id } = req.params;
  const { fileName, caracterizacion_id, source, user_id, fieldName } = req.body;
  const finalUserId = user_id || 0; 

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo' });
    }

    if (table_name !== 'pi_anexosv2') {
      return res.status(400).json({ message: 'Este endpoint es solo para pi_anexosv2' });
    }

    if (!caracterizacion_id) {
      return res.status(400).json({
        message: 'El ID de caracterización es requerido',
      });
    }

    if (!fieldName) {
      return res.status(400).json({
        message: 'El nombre del campo es requerido para AnexosV2',
      });
    }

    const finalFileName = fileName || req.file.originalname;

    // Generar la ruta de GCS usando generateVisita1Path
    let gcsPath;
    try {
      const { generateVisita1Path } = require('../utils/gcs');
      gcsPath = await generateVisita1Path(caracterizacion_id, fieldName, finalFileName);
    } catch (pathError) {
      return res.status(500).json({
        message: 'Error generando la ruta del archivo',
        error: pathError.message,
      });
    }

    // Sube el archivo temporal a GCS
    let gcsDestination;
    try {
      const { uploadFileToGCS } = require('../utils/gcs');
      gcsDestination = await uploadFileToGCS(req.file.path, gcsPath);
    } catch (gcsError) {
      return res.status(500).json({
        message: 'Error subiendo el archivo a Google Cloud Storage',
        error: gcsError.message || gcsError,
      });
    }

    // Borra el archivo temporal local
    try {
      fs.unlinkSync(req.file.path);
    } catch (fsError) {
      // Continuar aunque falle la eliminación del archivo temporal
    }

    // Guarda la ruta de GCS en la base de datos
    const newFile = await File.create({
      record_id: caracterizacion_id,
      table_name: 'pi_anexosv2',
      name: finalFileName,
      file_path: gcsDestination,
      source: source || 'anexosv2',
    });

    // Extraer formulacion_id del nombre del archivo si existe
    let formulacion_id = null;
    const match = finalFileName.match(/_formulacion_(\d+)/);
    if (match) {
      formulacion_id = parseInt(match[1], 10);
    }

    // Insertar en el historial
    await insertHistory(
      'pi_anexosv2',
      caracterizacion_id,
      finalUserId,
      'upload_file',
      formulacion_id ? `Archivo (formulacion_id:${formulacion_id})` : 'Archivo',
      null,
      newFile.name,
      `Se subió el archivo AnexosV2: ${newFile.name} (Campo: ${fieldName})`
    );

    res.status(200).json({
      message: 'Archivo AnexosV2 subido exitosamente',
      file: newFile,
      url: gcsDestination,
    });
  } catch (error) {
    console.error('Error subiendo el archivo AnexosV2:', error);
    res.status(500).json({
      message: 'Error subiendo el archivo AnexosV2',
      error: error.message,
    });
  }
};

// ----------------------------------------------------------------------------------------
// ---------------------------- CONTROLADORES PARA TABLAS MASTER_ --------------------------
// ----------------------------------------------------------------------------------------

// Controlador para crear un nuevo registro en una tabla master_
exports.createMasterTableRecord = async (req, res) => {
  const { table_name } = req.params;
  const data = req.body;

  // Validar que la tabla empiece con master_
  if (!table_name.startsWith('master_')) {
    return res.status(400).json({ message: 'Nombre de tabla inválido. Debe empezar con master_' });
  }

  // Asegurar que llegue user_id para el historial
  const userId = data.user_id;
  if (!userId) {
    return res.status(400).json({
      message: 'Falta user_id en la petición para el historial.'
    });
  }

  try {
    // 1. OBTENER CAMPOS DE LA TABLA
    const fieldsQueryResult = await sequelize.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER(?)`,
      {
        replacements: [table_name],
        type: sequelize.QueryTypes.SELECT
      }
    );
    const fields = fieldsQueryResult.map((field) => field.column_name).filter(Boolean);

    if (fields.length === 0) {
      return res.status(500).json({
        message: 'No se pudieron obtener los campos de la tabla.'
      });
    }

    // 2. FILTRAR DATOS, ignorando user_id (que es para historial)
    const filteredData = {};
    for (const key in data) {
      if (
        key !== 'user_id' &&
        fields.includes(key) &&
        data[key] !== undefined &&
        data[key] !== null
      ) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        message: 'No se proporcionaron campos válidos para crear el registro.'
      });
    }

    // 3. CREAR EL REGISTRO
    const insertFields = Object.keys(filteredData).map((f) => `"${f}"`).join(', ');
    const insertValues = Object.keys(filteredData).map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `
      INSERT INTO "${table_name}" (${insertFields})
      VALUES (${insertValues})
      RETURNING *
    `;

    const [newRecord] = await sequelize.query(insertQuery, {
      bind: Object.values(filteredData),
      type: sequelize.QueryTypes.INSERT
    });

    const createdRecord = newRecord[0];

    // Registrar en historial: cada campo creado con oldValue = null
    for (const key of Object.keys(filteredData)) {
      await insertHistory(
        table_name,
        createdRecord.id,
        userId,
        'create',
        key,
        null,
        createdRecord[key],
        `Campo ${key} creado`
      );
    }

    return res.status(201).json({
      message: `Registro creado con éxito (${table_name})`,
      record: createdRecord,
    });

  } catch (error) {
    console.error('Error creando registro en tabla master:', error);
    return res.status(500).json({
      message: 'Error creando el registro',
      error: error.message,
    });
  }
};

// Controlador para actualizar un registro existente en una tabla master_
exports.updateMasterTableRecord = async (req, res) => {
  const { table_name, record_id } = req.params;
  const data = req.body;

  // Validar que la tabla empiece con master_
  if (!table_name.startsWith('master_')) {
    return res.status(400).json({ message: 'Nombre de tabla inválido. Debe empezar con master_' });
  }

  // Asegurar que llegue user_id para el historial
  const userId = data.user_id;
  if (!userId) {
    return res.status(400).json({
      message: 'Falta user_id en la petición para el historial.'
    });
  }

  try {
    // 1. OBTENER CAMPOS DE LA TABLA
    const fieldsQueryResult = await sequelize.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER(?)`,
      {
        replacements: [table_name],
        type: sequelize.QueryTypes.SELECT
      }
    );
    const fields = fieldsQueryResult.map((field) => field.column_name).filter(Boolean);

    if (fields.length === 0) {
      return res.status(500).json({
        message: 'No se pudieron obtener los campos de la tabla.'
      });
    }

    // 2. OBTENER REGISTRO ACTUAL PARA COMPARAR
    const currentRecordQuery = `SELECT * FROM "${table_name}" WHERE id = ?`;
    const [currentRecord] = await sequelize.query(currentRecordQuery, {
      replacements: [record_id],
      type: sequelize.QueryTypes.SELECT
    });

    if (!currentRecord) {
      return res.status(404).json({
        message: 'Registro no encontrado'
      });
    }

    // 3. FILTRAR DATOS, ignorando user_id (que es para historial)
    const filteredData = {};
    for (const key in data) {
      if (
        key !== 'user_id' &&
        fields.includes(key) &&
        data[key] !== undefined &&
        data[key] !== null
      ) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        message: 'No se proporcionaron campos válidos para actualizar el registro.'
      });
    }

    // 4. ACTUALIZAR EL REGISTRO
    const updateFields = Object.keys(filteredData).map((f) => `"${f}" = ?`).join(', ');
    const updateQuery = `
      UPDATE "${table_name}"
      SET ${updateFields}
      WHERE id = ?
      RETURNING *
    `;

    const updateValues = [...Object.values(filteredData), record_id];
    const [updatedRecord] = await sequelize.query(updateQuery, {
      replacements: updateValues,
      type: sequelize.QueryTypes.UPDATE
    });

    // 5. REGISTRAR EN HISTORIAL
    for (const key of Object.keys(filteredData)) {
      const oldValue = currentRecord[key];
      const newValue = filteredData[key];
      
      if (oldValue !== newValue) {
        await insertHistory(
          table_name,
          record_id,
          userId,
          'update',
          key,
          oldValue,
          newValue,
          `Campo ${key} actualizado`
        );
      }
    }

    return res.status(200).json({
      message: `Registro actualizado con éxito (${table_name})`,
      record: updatedRecord[0],
    });

  } catch (error) {
    console.error('Error actualizando registro en tabla master:', error);
    return res.status(500).json({
      message: 'Error actualizando el registro',
      error: error.message,
    });
  }
};

// Controlador para obtener registros de una tabla master_
exports.getMasterTableRecords = async (req, res) => {
  const { table_name } = req.params;
  const { caracterizacion_id } = req.query;

  // Validar que la tabla empiece con master_
  if (!table_name.startsWith('master_')) {
    return res.status(400).json({ message: 'Nombre de tabla inválido. Debe empezar con master_' });
  }

  try {
    let query = `SELECT * FROM "${table_name}"`;
    const replacements = [];

    if (caracterizacion_id) {
      query += ` WHERE caracterizacion_id = ?`;
      replacements.push(caracterizacion_id);
    }

    query += ` ORDER BY id ASC`;

    const records = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    return res.status(200).json(records);

  } catch (error) {
    console.error('Error obteniendo registros de tabla master:', error);
    return res.status(500).json({
      message: 'Error obteniendo los registros',
      error: error.message,
    });
  }
};

// Controlador para obtener un registro específico de una tabla master_
exports.getMasterTableRecordById = async (req, res) => {
  const { table_name, record_id } = req.params;

  // Validar que la tabla empiece con master_
  if (!table_name.startsWith('master_')) {
    return res.status(400).json({ message: 'Nombre de tabla inválido. Debe empezar con master_' });
  }

  try {
    const query = `SELECT * FROM "${table_name}" WHERE id = ?`;
    const [record] = await sequelize.query(query, {
      replacements: [record_id],
      type: sequelize.QueryTypes.SELECT
    });

    if (!record) {
      return res.status(404).json({
        message: 'Registro no encontrado'
      });
    }

    return res.status(200).json({ record });

  } catch (error) {
    console.error('Error obteniendo registro de tabla master:', error);
    return res.status(500).json({
      message: 'Error obteniendo el registro',
      error: error.message,
    });
  }
};