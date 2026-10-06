const express = require('express');
const pool = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// Todas las rutas de catálogos requieren autenticación previa
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Obtener todos los catálogos en un solo llamado
router.get('/', async (req, res) => {
  try {
    const tipos = await pool.query('SELECT * FROM tipos_equipo ORDER BY id ASC');
    const empresas = await pool.query('SELECT * FROM catalogos_empresas ORDER BY nombre ASC');
    const bases = await pool.query('SELECT * FROM catalogos_bases ORDER BY nombre ASC');
    const areas = await pool.query('SELECT * FROM catalogos_areas ORDER BY nombre ASC');

    res.json({
      tipos_equipo: tipos.rows,
      empresas: empresas.rows,
      bases: bases.rows,
      areas: areas.rows
    });
  } catch (err) {
    console.error('Error al obtener catálogos:', err);
    res.status(500).json({ error: 'Error al consultar los catálogos' });
  }
});

// --- CRUD TIPOS DE EQUIPO ---

router.post('/tipos-equipo', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del tipo de equipo es obligatorio' });
    }

    const result = await pool.query(
      'INSERT INTO tipos_equipo (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion ? descripcion.trim() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear tipo de equipo:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear tipo de equipo' });
  }
});

router.put('/tipos-equipo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del tipo de equipo es obligatorio' });
    }

    const result = await pool.query(
      'UPDATE tipos_equipo SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
      [nombre.trim(), descripcion ? descripcion.trim() : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de equipo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar tipo de equipo:', err);
    res.status(500).json({ error: 'Error al actualizar tipo de equipo' });
  }
});

router.delete('/tipos-equipo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (numericId === 1) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría predeterminada "Equipo de Cómputo"' });
    }

    // Reasignar los equipos que usen este tipo_equipo al por defecto (1)
    await pool.query('UPDATE equipos SET tipo_equipo_id = 1 WHERE tipo_equipo_id = $1', [numericId]);

    const result = await pool.query('DELETE FROM tipos_equipo WHERE id = $1 RETURNING *', [numericId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de equipo no encontrado' });
    }

    res.json({ message: 'Tipo de equipo eliminado correctamente', tipo: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar tipo de equipo:', err);
    res.status(500).json({ error: 'Error al eliminar tipo de equipo' });
  }
});

// --- CRUD EMPRESAS ---

router.post('/empresas', async (req, res) => {
  try {
    const { nombre, acronimo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre completo de la empresa es obligatorio' });
    }
    const acronym = (acronimo || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(acronym)) {
      return res.status(400).json({ error: 'El acrónimo debe tener exactamente 3 letras' });
    }

    const result = await pool.query(
      'INSERT INTO catalogos_empresas (nombre, acronimo) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), acronym]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear empresa:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'La empresa ya está registrada' });
    }
    res.status(500).json({ error: 'Error al registrar empresa' });
  }
});

router.put('/empresas/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, acronimo } = req.body;
    const fullName = (nombre || '').trim();
    const acronym = (acronimo || '').trim().toUpperCase();
    if (!fullName || !/^[A-Z]{3}$/.test(acronym)) {
      return res.status(400).json({ error: 'Indica el nombre completo y un acrónimo de 3 letras' });
    }

    await client.query('BEGIN');
    const previous = await client.query('SELECT * FROM catalogos_empresas WHERE id = $1 FOR UPDATE', [id]);
    if (previous.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    const old = previous.rows[0];
    const result = await client.query(
      'UPDATE catalogos_empresas SET nombre = $1, acronimo = $2 WHERE id = $3 RETURNING *',
      [fullName, acronym, id]
    );
    // Personal muestra el nombre completo; inventario conserva sólo el acrónimo.
    await client.query('UPDATE empleados SET empresa = $1 WHERE empresa = $2', [fullName, old.nombre]);
    await client.query('UPDATE equipos SET empresa = $1 WHERE empresa = $2 OR empresa = $3', [acronym, old.acronimo, old.nombre]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar empresa:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'El nombre o acrónimo ya está registrado' });
    res.status(500).json({ error: 'Error al actualizar empresa' });
  } finally {
    client.release();
  }
});

router.delete('/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM catalogos_empresas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ message: 'Empresa eliminada del catálogo correctamente' });
  } catch (err) {
    console.error('Error al eliminar empresa:', err);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
});

async function updateSimpleCatalog(req, res, table, label) {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: `El nombre de ${label} es obligatorio` });
    const result = await pool.query(`UPDATE ${table} SET nombre = $1 WHERE id = $2 RETURNING *`, [nombre, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: `${label} no encontrado` });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error al actualizar ${label}:`, err);
    if (err.code === '23505') return res.status(400).json({ error: `Ya existe ${label} con ese nombre` });
    res.status(500).json({ error: `Error al actualizar ${label}` });
  }
}

// --- CRUD BASES / CIUDADES ---

router.post('/bases', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la base/ciudad es obligatorio' });
    }

    const result = await pool.query(
      'INSERT INTO catalogos_bases (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear base/ciudad:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'La base/ciudad ya está registrada' });
    }
    res.status(500).json({ error: 'Error al registrar base/ciudad' });
  }
});

router.delete('/bases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM catalogos_bases WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Base/ciudad no encontrada' });
    }

    res.json({ message: 'Base/ciudad eliminada del catálogo correctamente' });
  } catch (err) {
    console.error('Error al eliminar base/ciudad:', err);
    res.status(500).json({ error: 'Error al eliminar base/ciudad' });
  }
});

router.put('/bases/:id', (req, res) => updateSimpleCatalog(req, res, 'catalogos_bases', 'la base/ciudad'));

// --- CRUD ÁREAS ---

router.post('/areas', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del área es obligatorio' });
    }

    const result = await pool.query(
      'INSERT INTO catalogos_areas (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear área:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El área ya está registrada' });
    }
    res.status(500).json({ error: 'Error al registrar área' });
  }
});

router.delete('/areas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM catalogos_areas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }

    res.json({ message: 'Área eliminada del catálogo correctamente' });
  } catch (err) {
    console.error('Error al eliminar área:', err);
    res.status(500).json({ error: 'Error al eliminar área' });
  }
});

router.put('/areas/:id', (req, res) => updateSimpleCatalog(req, res, 'catalogos_areas', 'el área'));

module.exports = router;
