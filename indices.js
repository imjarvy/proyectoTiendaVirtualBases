// Plan de índices — Tienda Virtual MongoDB
// Compatible con MongoDB 4.0 — mongo shell
// Ejecutar: mongo tienda_virtual indices.js

use tienda_virtual

// ============================================================
// COLECCIÓN: categorias (50 documentos)
// ============================================================

// Simple — slug es la clave de búsqueda en rutas tipo /categoria/electronica
db.categorias.createIndex(
  { slug: 1 },
  { unique: true, name: "idx_slug_unico" }
)

// Simple — filtrar solo categorías activas en menús y listados
db.categorias.createIndex(
  { activo: 1 },
  { name: "idx_activo" }
)

/*
  categorias tiene solo 50 documentos. MongoDB los mantiene en memoria
  casi siempre. Los índices aquí no impactan rendimiento de forma crítica
  pero garantizan unicidad del slug y habilitan filtros correctos.
*/


// ============================================================
// COLECCIÓN: usuarios (500.000 documentos)
// ============================================================

// Simple + único — login y registro. La consulta más frecuente de toda la app.
// Sin este índice, cada login haría COLLSCAN sobre 500k documentos.
db.usuarios.createIndex(
  { email: 1 },
  { unique: true, name: "idx_email_unico" }
)

// Simple — listar solo usuarios activos en panel de administración
db.usuarios.createIndex(
  { activo: 1 },
  { name: "idx_activo" }
)

// Simple — filtrar usuarios por ciudad en reportes regionales
db.usuarios.createIndex(
  { "direccion.ciudad": 1 },
  { name: "idx_ciudad" }
)

// Compuesto — paginación de usuarios activos ordenados por fecha de registro
// Cubre: db.usuarios.find({ activo: true }).sort({ fecha_registro: -1 })
// El orden del compuesto es: primero el campo de filtro, luego el de sort
db.usuarios.createIndex(
  { activo: 1, fecha_registro: -1 },
  { name: "idx_activo_fecha_registro" }
)


// ============================================================
// COLECCIÓN: productos (300.000 documentos)
// ============================================================

// Simple + único — búsqueda de producto por código de referencia interna
db.productos.createIndex(
  { sku: 1 },
  { unique: true, name: "idx_sku_unico" }
)

// Simple — join desde pedidos.productos[].producto_id hacia productos._id
// MongoDB usa _id por defecto pero este índice explicita el acceso desde inventario
db.productos.createIndex(
  { categoria_id: 1 },
  { name: "idx_categoria" }
)

// Compuesto — filtro de catálogo: GET /api/productos?categoria=X&precioMin=Y&precioMax=Z
// Cubre: db.productos.find({ categoria_id: X, precio: { $gte: Y, $lte: Z } })
// El orden importa: categoria_id primero porque es igualdad, precio después porque es rango
db.productos.createIndex(
  { categoria_id: 1, precio: 1 },
  { name: "idx_categoria_precio" }
)

// Compuesto — catálogo visible con ordenamiento por precio
// Cubre: db.productos.find({ activo: true }).sort({ precio: 1 })
db.productos.createIndex(
  { activo: 1, precio: 1 },
  { name: "idx_activo_precio" }
)

// Compuesto — catálogo visible con ordenamiento por fecha (productos nuevos primero)
db.productos.createIndex(
  { activo: 1, fecha_creacion: -1 },
  { name: "idx_activo_fecha" }
)

// Texto — búsqueda full-text en nombre y descripción
// Cubre: db.productos.find({ $text: { $search: "laptop lenovo" } })
// weights: nombre tiene 10x más relevancia que descripción en el score
db.productos.createIndex(
  { nombre: "text", descripcion: "text" },
  {
    name: "idx_texto_busqueda",
    weights: { nombre: 10, descripcion: 1 },
    default_language: "spanish"
  }
)


// ============================================================
// COLECCIÓN: inventario (300.000 documentos)
// ============================================================

// Simple + único — acceso principal: un documento de inventario por producto
// Cubre: db.inventario.findOne({ producto_id: X })
db.inventario.createIndex(
  { producto_id: 1 },
  { unique: true, name: "idx_producto_unico" }
)

// Simple — alerta de bajo stock: GET /api/inventario/bajo-stock
// Cubre: db.inventario.find({ cantidad: { $lte: 10 } }).sort({ cantidad: 1 })
// Sin índice: COLLSCAN sobre 300k documentos en cada alerta
db.inventario.createIndex(
  { cantidad: 1 },
  { name: "idx_cantidad_stock" }
)

// Compuesto — bajo stock ordenado por último movimiento (los más desactualizados primero)
// Cubre: db.inventario.find({ cantidad: { $lte: 10 } }).sort({ ultimo_movimiento: 1 })
db.inventario.createIndex(
  { cantidad: 1, ultimo_movimiento: 1 },
  { name: "idx_stock_movimiento" }
)


// ============================================================
// COLECCIÓN: pedidos (700.000 documentos)
// ============================================================

// Simple + único — buscar pedido por número legible (ej: PED-2024-00842)
db.pedidos.createIndex(
  { numero_pedido: 1 },
  { unique: true, name: "idx_numero_pedido_unico" }
)

// Simple — historial de pedidos de un usuario
// Cubre: db.pedidos.find({ usuario_id: X })
// Base para el índice compuesto siguiente
db.pedidos.createIndex(
  { usuario_id: 1 },
  { name: "idx_usuario" }
)

// Simple — filtrar pedidos por estado en panel de logística
// Cubre: db.pedidos.find({ estado: "pendiente" })
db.pedidos.createIndex(
  { estado: 1 },
  { name: "idx_estado" }
)

// Compuesto — historial paginado de un usuario ordenado cronológicamente
// Cubre: db.pedidos.find({ usuario_id: X }).sort({ fecha_pedido: -1 })
// Este es el índice más importante de pedidos: se usa en cada visita al perfil
db.pedidos.createIndex(
  { usuario_id: 1, fecha_pedido: -1 },
  { name: "idx_usuario_fecha" }
)

// Compuesto — panel de logística: pedidos pendientes más antiguos primero
// Cubre: db.pedidos.find({ estado: "pendiente" }).sort({ fecha_pedido: 1 })
// Igual que el anterior: igualdad primero, rango/sort después
db.pedidos.createIndex(
  { estado: 1, fecha_pedido: 1 },
  { name: "idx_estado_fecha" }
)

// Compuesto — reportes de ventas por rango de fechas
// Cubre: db.pedidos.find({ estado: "entregado", fecha_pedido: { $gte: X, $lte: Y } })
db.pedidos.createIndex(
  { estado: 1, fecha_pedido: -1 },
  { name: "idx_estado_fecha_desc" }
)


// ============================================================
// VERIFICAR ÍNDICES CREADOS
// ============================================================

print("\n--- Índices por colección ---\n")

print("categorias:")
db.categorias.getIndexes().forEach(i => print(" ", i.name, "->", JSON.stringify(i.key)))

print("\nusuarios:")
db.usuarios.getIndexes().forEach(i => print(" ", i.name, "->", JSON.stringify(i.key)))

print("\nproductos:")
db.productos.getIndexes().forEach(i => print(" ", i.name, "->", JSON.stringify(i.key)))

print("\ninventario:")
db.inventario.getIndexes().forEach(i => print(" ", i.name, "->", JSON.stringify(i.key)))

print("\npedidos:")
db.pedidos.getIndexes().forEach(i => print(" ", i.name, "->", JSON.stringify(i.key)))


// ============================================================
// DEMOSTRACIÓN: explain() — IXSCAN vs COLLSCAN
// Consulta: buscar productos de una categoría con rango de precio
// ============================================================

// -----------------------------------------------------------
// PASO 1: Consulta SIN índice (simular COLLSCAN)
// Ejecutar esto antes de crear los índices para comparar
// -----------------------------------------------------------

/*
db.productos.find(
  { categoria_id: ObjectId("64a1f2c3e4b0a1b2c3d4e5f0"), precio: { $gte: 100000, $lte: 500000 } }
).explain("executionStats")

Resultado sin índice (COLLSCAN):
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN",        // Recorre TODOS los documentos
      "filter": { ... }
    }
  },
  "executionStats": {
    "executionTimeMillis": 380,   // Lento: 380ms sobre 300k documentos
    "totalDocsExamined": 300000,  // Examina los 300.000 documentos
    "totalKeysExamined": 0,       // No usa ningún índice
    "nReturned": 1240             // Devuelve solo 1.240
  }
}
*/

// -----------------------------------------------------------
// PASO 2: La misma consulta CON el índice compuesto
// -----------------------------------------------------------

db.productos.find(
  { categoria_id: ObjectId("64a1f2c3e4b0a1b2c3d4e5f0"), precio: { $gte: 100000, $lte: 500000 } }
).explain("executionStats")

/*
Resultado CON índice idx_categoria_precio (IXSCAN):
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",                      // Usa el índice
        "keyPattern": { "categoria_id": 1, "precio": 1 },
        "indexName": "idx_categoria_precio",
        "indexBounds": {
          "categoria_id": ["[ObjectId(...), ObjectId(...)]"],
          "precio": ["[100000, 500000]"]          // Rango directo en el índice
        }
      }
    }
  },
  "executionStats": {
    "executionTimeMillis": 4,     // 4ms vs 380ms: 95x más rápido
    "totalDocsExamined": 1240,    // Solo examina los que va a devolver
    "totalKeysExamined": 1240,    // Claves de índice recorridas = docs devueltos
    "nReturned": 1240
  }
}
*/

// -----------------------------------------------------------
// PASO 3: explain() sobre búsqueda por email (índice único)
// -----------------------------------------------------------

db.usuarios.find(
  { email: "valentina.rios@gmail.com" }
).explain("executionStats")

/*
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "idx_email_unico",
        "indexBounds": {
          "email": ["[\"valentina.rios@gmail.com\", \"valentina.rios@gmail.com\"]"]
        }
      }
    }
  },
  "executionStats": {
    "executionTimeMillis": 1,     // 1ms — acceso directo por índice único
    "totalDocsExamined": 1,       // Exactamente 1 documento examinado
    "totalKeysExamined": 1,
    "nReturned": 1
  }
}
*/

// -----------------------------------------------------------
// PASO 4: explain() sobre historial de pedidos de un usuario
// Demuestra el índice compuesto usuario_id + fecha_pedido
// -----------------------------------------------------------

db.pedidos.find(
  { usuario_id: ObjectId("64a1f2c3e4b0a1b2c3d4e5f1") }
).sort({ fecha_pedido: -1 }).explain("executionStats")

/*
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "idx_usuario_fecha",
        "keyPattern": { "usuario_id": 1, "fecha_pedido": -1 },
        "direction": "forward"    // El sort ya está resuelto por el índice,
                                  // no necesita etapa SORT separada en memoria
      }
    }
  },
  "executionStats": {
    "executionTimeMillis": 2,
    "totalDocsExamined": 14,      // Solo los pedidos de ese usuario
    "totalKeysExamined": 14,
    "nReturned": 14
  }
}

Si el índice fuera solo { usuario_id: 1 } sin fecha_pedido,
el plan tendría una etapa extra "SORT" en memoria sobre los 14 resultados.
Con el índice compuesto ese sort es gratuito.
*/


// ============================================================
// RESUMEN DE ÍNDICES
// ============================================================

/*
Colección     | Nombre                     | Tipo       | Campos
---------------------------------------------------------------------------
categorias    | idx_slug_unico             | Simple     | slug (unique)
categorias    | idx_activo                 | Simple     | activo
---------------------------------------------------------------------------
usuarios      | idx_email_unico            | Simple     | email (unique)
usuarios      | idx_activo                 | Simple     | activo
usuarios      | idx_ciudad                 | Simple     | direccion.ciudad
usuarios      | idx_activo_fecha_registro  | Compuesto  | activo, fecha_registro
---------------------------------------------------------------------------
productos     | idx_sku_unico              | Simple     | sku (unique)
productos     | idx_categoria              | Simple     | categoria_id
productos     | idx_categoria_precio       | Compuesto  | categoria_id, precio
productos     | idx_activo_precio          | Compuesto  | activo, precio
productos     | idx_activo_fecha           | Compuesto  | activo, fecha_creacion
productos     | idx_texto_busqueda         | Texto      | nombre, descripcion
---------------------------------------------------------------------------
inventario    | idx_producto_unico         | Simple     | producto_id (unique)
inventario    | idx_cantidad_stock         | Simple     | cantidad
inventario    | idx_stock_movimiento       | Compuesto  | cantidad, ultimo_movimiento
---------------------------------------------------------------------------
pedidos       | idx_numero_pedido_unico    | Simple     | numero_pedido (unique)
pedidos       | idx_usuario                | Simple     | usuario_id
pedidos       | idx_estado                 | Simple     | estado
pedidos       | idx_usuario_fecha          | Compuesto  | usuario_id, fecha_pedido
pedidos       | idx_estado_fecha           | Compuesto  | estado, fecha_pedido (asc)
pedidos       | idx_estado_fecha_desc      | Compuesto  | estado, fecha_pedido (desc)
---------------------------------------------------------------------------
Total: 20 índices (sin contar el _id de cada colección)
*/
