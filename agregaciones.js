# Agregaciones MongoDB — Tienda Virtual
# Compatible con MongoDB 4.0 — mongo shell
# Ejecutar directamente con: mongo tienda_virtual agregaciones.js
# O copiar cada bloque en el shell interactivo

use tienda_virtual

# ============================================================
# AGREGACIÓN 1: Top 10 productos más vendidos
# Desanida el array productos[] de cada pedido y suma
# las cantidades vendidas por producto
# ============================================================

db.pedidos.aggregate([

  # Solo pedidos entregados o enviados (ventas reales)
  { $match: {
      estado: { $in: ["entregado", "enviado"] }
  }},

  # Desanidar el array productos[] — genera un documento por cada línea de pedido
  { $unwind: "$productos" },

  # Agrupar por producto_id y sumar cantidades vendidas
  { $group: {
      _id:              "$productos.producto_id",
      nombre_producto:  { $first: "$productos.nombre_snapshot" },
      total_vendido:    { $sum: "$productos.cantidad" },
      total_ingresos:   { $sum: "$productos.subtotal" },
      veces_en_pedidos: { $sum: 1 }
  }},

  # Ordenar de mayor a menor por cantidad vendida
  { $sort: { total_vendido: -1 } },

  # Limitar a los 10 primeros
  { $limit: 10 },

  # Dar forma al documento de salida
  { $project: {
      _id:             1,
      nombre_producto: 1,
      total_vendido:   1,
      total_ingresos:  1,
      veces_en_pedidos: 1
  }}

])

/*
Resultado esperado:
[
  {
    "_id": ObjectId("64a1..."),
    "nombre_producto": "Laptop Lenovo IdeaPad 3",
    "total_vendido": 1842,
    "total_ingresos": 4512900000,
    "veces_en_pedidos": 1820
  },
  {
    "_id": ObjectId("64b2..."),
    "nombre_producto": "Mouse Inalambrico Logitech M185",
    "total_vendido": 3201,
    "total_ingresos": 272085000,
    "veces_en_pedidos": 3100
  },
  ...
]
*/


# ============================================================
# AGREGACIÓN 2: Ventas totales por categoría
# Parte de pedidos → desanida productos embebidos →
# hace join con productos → hace join con categorias
# ============================================================

db.pedidos.aggregate([

  # Solo pedidos que generaron ingreso real
  { $match: {
      estado: { $in: ["entregado", "enviado"] }
  }},

  # Desanidar el array de productos del pedido
  { $unwind: "$productos" },

  # Join: traer el documento de productos usando producto_id del snapshot
  { $lookup: {
      from:         "productos",
      localField:   "productos.producto_id",
      foreignField: "_id",
      as:           "producto_info"
  }},

  # Convertir array resultado del lookup en un solo objeto
  { $unwind: "$producto_info" },

  # Join: traer la categoría usando categoria_id del producto
  { $lookup: {
      from:         "categorias",
      localField:   "producto_info.categoria_id",
      foreignField: "_id",
      as:           "categoria_info"
  }},

  # Convertir array resultado del lookup en un solo objeto
  { $unwind: "$categoria_info" },

  # Agrupar por categoría y acumular métricas de venta
  { $group: {
      _id:                  "$categoria_info._id",
      nombre_categoria:     { $first: "$categoria_info.nombre" },
      total_ingresos:       { $sum: "$productos.subtotal" },
      unidades_vendidas:    { $sum: "$productos.cantidad" },
      cantidad_pedidos:     { $sum: 1 },
      ticket_promedio:      { $avg: "$productos.subtotal" }
  }},

  # Ordenar por ingresos de mayor a menor
  { $sort: { total_ingresos: -1 } },

  # Formato de salida
  { $project: {
      _id:               1,
      nombre_categoria:  1,
      total_ingresos:    1,
      unidades_vendidas: 1,
      cantidad_pedidos:  1,
      ticket_promedio:   { $round: ["$ticket_promedio", 0] }
  }}

])

/*
Resultado esperado:
[
  {
    "_id": ObjectId("64a1..."),
    "nombre_categoria": "Electronica",
    "total_ingresos": 18500000000,
    "unidades_vendidas": 45200,
    "cantidad_pedidos": 38700,
    "ticket_promedio": 409292
  },
  {
    "_id": ObjectId("64a2..."),
    "nombre_categoria": "Ropa",
    "total_ingresos": 4200000000,
    "unidades_vendidas": 98000,
    "cantidad_pedidos": 72000,
    "ticket_promedio": 57692
  },
  ...
]
*/


# ============================================================
# AGREGACIÓN 3: Top 5 usuarios con mayor gasto histórico
# Parte de pedidos → agrupa por usuario → join con usuarios
# ============================================================

db.pedidos.aggregate([

  # Excluir pedidos cancelados del gasto total
  { $match: {
      estado: { $in: ["entregado", "enviado", "pendiente"] }
  }},

  # Agrupar por usuario y sumar su gasto total
  { $group: {
      _id:              "$usuario_id",
      gasto_total:      { $sum: "$total" },
      total_pedidos:    { $sum: 1 },
      ticket_promedio:  { $avg: "$total" },
      primer_compra:    { $min: "$fecha_pedido" },
      ultima_compra:    { $max: "$fecha_pedido" }
  }},

  # Ordenar por gasto de mayor a menor
  { $sort: { gasto_total: -1 } },

  # Tomar solo los 5 primeros antes del join (más eficiente)
  { $limit: 5 },

  # Join: traer datos del usuario
  { $lookup: {
      from:         "usuarios",
      localField:   "_id",
      foreignField: "_id",
      as:           "usuario_info"
  }},

  # Convertir array del lookup en objeto
  { $unwind: "$usuario_info" },

  # Formato de salida — sin datos sensibles
  { $project: {
      _id:             1,
      gasto_total:     1,
      total_pedidos:   1,
      ticket_promedio: { $round: ["$ticket_promedio", 0] },
      primer_compra:   1,
      ultima_compra:   1,
      nombre:          "$usuario_info.nombre",
      email:           "$usuario_info.email",
      ciudad:          "$usuario_info.direccion.ciudad"
  }}

])

/*
Resultado esperado:
[
  {
    "_id": ObjectId("64c1..."),
    "gasto_total": 45800000,
    "total_pedidos": 28,
    "ticket_promedio": 1635714,
    "primer_compra": ISODate("2022-03-10"),
    "ultima_compra": ISODate("2024-05-28"),
    "nombre": "Carlos Herrera",
    "email": "carlos.herrera@gmail.com",
    "ciudad": "Medellin"
  },
  ...
]
*/


# ============================================================
# AGREGACIÓN 4: Promedio de productos por pedido y valor
# promedio mensual — últimos 6 meses
# ============================================================

db.pedidos.aggregate([

  # Filtrar pedidos de los últimos 6 meses
  # Date.now() - 6 meses aproximado en milisegundos
  { $match: {
      fecha_pedido: {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
      },
      estado: { $in: ["entregado", "enviado", "pendiente"] }
  }},

  # Agregar campo calculado: cantidad de líneas en el array productos
  { $addFields: {
      cantidad_lineas: { $size: "$productos" }
  }},

  # Agrupar por año y mes para obtener métricas mensuales
  { $group: {
      _id: {
        anio: { $year:  "$fecha_pedido" },
        mes:  { $month: "$fecha_pedido" }
      },
      total_pedidos:             { $sum: 1 },
      valor_promedio_pedido:     { $avg: "$total" },
      valor_total_mes:           { $sum: "$total" },
      promedio_lineas_por_pedido: { $avg: "$cantidad_lineas" },
      max_valor_pedido:          { $max: "$total" },
      min_valor_pedido:          { $min: "$total" }
  }},

  # Ordenar cronológicamente
  { $sort: { "_id.anio": 1, "_id.mes": 1 } },

  # Formato de salida con valores redondeados
  { $project: {
      _id:                       1,
      total_pedidos:             1,
      valor_total_mes:           1,
      valor_promedio_pedido:     { $round: ["$valor_promedio_pedido", 0] },
      promedio_lineas_por_pedido: { $round: ["$promedio_lineas_por_pedido", 2] },
      max_valor_pedido:          1,
      min_valor_pedido:          1
  }}

])

/*
Resultado esperado:
[
  {
    "_id": { "anio": 2024, "mes": 1 },
    "total_pedidos": 12840,
    "valor_total_mes": 18200000000,
    "valor_promedio_pedido": 1417757,
    "promedio_lineas_por_pedido": 2.34,
    "max_valor_pedido": 12500000,
    "min_valor_pedido": 15000
  },
  {
    "_id": { "anio": 2024, "mes": 2 },
    "total_pedidos": 11200,
    "valor_total_mes": 15800000000,
    "valor_promedio_pedido": 1410714,
    "promedio_lineas_por_pedido": 2.28,
    "max_valor_pedido": 9800000,
    "min_valor_pedido": 22000
  },
  ...
]
*/


# ============================================================
# AGREGACIÓN 5: Distribución de pedidos por estado
# con porcentaje del total
# ============================================================

db.pedidos.aggregate([

  # Contar pedidos agrupados por estado
  { $group: {
      _id:      "$estado",
      cantidad: { $sum: 1 },
      valor_total: { $sum: "$total" }
  }},

  # Ordenar por cantidad descendente
  { $sort: { cantidad: -1 } },

  # Calcular el total general para el porcentaje en el siguiente stage
  { $group: {
      _id:   null,
      estados: {
        $push: {
          estado:      "$_id",
          cantidad:    "$cantidad",
          valor_total: "$valor_total"
        }
      },
      total_pedidos: { $sum: "$cantidad" }
  }},

  # Desanidar el array de estados para calcular porcentaje de cada uno
  { $unwind: "$estados" },

  # Calcular porcentaje y dar formato final
  { $project: {
      _id:           0,
      estado:        "$estados.estado",
      cantidad:      "$estados.cantidad",
      valor_total:   "$estados.valor_total",
      porcentaje:    {
        $round: [
          { $multiply: [
              { $divide: ["$estados.cantidad", "$total_pedidos"] },
              100
          ]},
          2
        ]
      },
      total_general: "$total_pedidos"
  }},

  # Reordenar por cantidad en la salida final
  { $sort: { cantidad: -1 } }

])

/*
Resultado esperado:
[
  {
    "estado": "entregado",
    "cantidad": 419970,
    "valor_total": 580000000000,
    "porcentaje": 60.0,
    "total_general": 699950
  },
  {
    "estado": "enviado",
    "cantidad": 139990,
    "valor_total": 195000000000,
    "porcentaje": 20.0,
    "total_general": 699950
  },
  {
    "estado": "pendiente",
    "cantidad": 104993,
    "valor_total": 148000000000,
    "porcentaje": 15.0,
    "total_general": 699950
  },
  {
    "estado": "cancelado",
    "cantidad": 34997,
    "valor_total": 0,
    "porcentaje": 5.0,
    "total_general": 699950
  }
]
*/


# ============================================================
# AGREGACIÓN 6: Productos con bajo stock (< 10 unidades)
# agrupados por categoría
# ============================================================

db.inventario.aggregate([

  # Filtrar solo registros con stock crítico
  { $match: {
      cantidad: { $lt: 10 }
  }},

  # Join: traer información del producto
  { $lookup: {
      from:         "productos",
      localField:   "producto_id",
      foreignField: "_id",
      as:           "producto_info"
  }},

  # Convertir array del lookup en objeto
  { $unwind: "$producto_info" },

  # Excluir productos inactivos (dados de baja del catálogo)
  { $match: {
      "producto_info.activo": true
  }},

  # Join: traer información de la categoría del producto
  { $lookup: {
      from:         "categorias",
      localField:   "producto_info.categoria_id",
      foreignField: "_id",
      as:           "categoria_info"
  }},

  # Convertir array del lookup en objeto
  { $unwind: "$categoria_info" },

  # Agrupar por categoría y acumular productos con bajo stock
  { $group: {
      _id:               "$categoria_info._id",
      nombre_categoria:  { $first: "$categoria_info.nombre" },
      total_productos_bajo_stock: { $sum: 1 },
      stock_promedio:    { $avg: "$cantidad" },
      productos: {
        $push: {
          producto_id: "$producto_id",
          nombre:      "$producto_info.nombre",
          sku:         "$producto_info.sku",
          precio:      "$producto_info.precio",
          stock_actual: "$cantidad",
          ultimo_movimiento: "$ultimo_movimiento"
        }
      }
  }},

  # Ordenar por cantidad de productos críticos de mayor a menor
  { $sort: { total_productos_bajo_stock: -1 } },

  # Formato de salida
  { $project: {
      _id:               1,
      nombre_categoria:  1,
      total_productos_bajo_stock: 1,
      stock_promedio:    { $round: ["$stock_promedio", 1] },
      productos:         1
  }}

])

/*
Resultado esperado:
[
  {
    "_id": ObjectId("64a1..."),
    "nombre_categoria": "Electronica",
    "total_productos_bajo_stock": 142,
    "stock_promedio": 4.3,
    "productos": [
      {
        "producto_id": ObjectId("64b1..."),
        "nombre": "Laptop Lenovo IdeaPad 3",
        "sku": "LEN-IDEA3-I5-512",
        "precio": 2450000,
        "stock_actual": 2,
        "ultimo_movimiento": ISODate("2024-06-01T15:20:00Z")
      },
      {
        "producto_id": ObjectId("64b2..."),
        "nombre": "Auriculares Sony WH-1000XM4",
        "sku": "SON-WH1000XM4",
        "precio": 1200000,
        "stock_actual": 0,
        "ultimo_movimiento": ISODate("2024-05-30T09:10:00Z")
      }
    ]
  },
  {
    "_id": ObjectId("64a2..."),
    "nombre_categoria": "Hogar",
    "total_productos_bajo_stock": 89,
    "stock_promedio": 5.7,
    "productos": [ ... ]
  }
]
*/
