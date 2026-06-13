# Comandos curl — Tienda Virtual MongoDB
# Ejecutar en orden: cada comando usa el ID del paso anterior
# Reemplazar BASE_URL, CATEGORIA_ID, USER_ID, PRODUCTO_1, PRODUCTO_2, PEDIDO_ID
# con los valores reales devueltos por cada respuesta

BASE_URL="http://localhost:3000"

# ============================================================
# 1. Crear categoría
# ============================================================
curl -s -X POST "$BASE_URL/api/categorias" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Electronica",
    "descripcion": "Dispositivos electronicos, gadgets y accesorios tecnologicos",
    "slug": "electronica",
    "imagen_url": "https://cdn.tienda.com/categorias/electronica.jpg"
  }' | python3 -m json.tool

# Guardar el _id devuelto en CATEGORIA_ID
# CATEGORIA_ID="<_id del resultado>"


# ============================================================
# 2. Crear producto 1
# ============================================================
curl -s -X POST "$BASE_URL/api/productos" \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"Laptop Lenovo IdeaPad 3 15ITL6\",
    \"descripcion\": \"Portatil Intel Core i5, 8GB RAM, SSD 512GB\",
    \"precio\": 2450000,
    \"sku\": \"LEN-IDEA3-I5-512\",
    \"categoria_id\": \"$CATEGORIA_ID\",
    \"imagenes\": [\"https://cdn.tienda.com/productos/lenovo-1.jpg\"],
    \"stock\": 50
  }" | python3 -m json.tool

# PRODUCTO_1="<_id del resultado>"


# ============================================================
# 3. Crear producto 2
# ============================================================
curl -s -X POST "$BASE_URL/api/productos" \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"Mouse Inalambrico Logitech M185\",
    \"descripcion\": \"Mouse inalambrico receptor USB nano\",
    \"precio\": 85000,
    \"sku\": \"LOG-M185-GRY\",
    \"categoria_id\": \"$CATEGORIA_ID\",
    \"imagenes\": [\"https://cdn.tienda.com/productos/logitech-m185.jpg\"],
    \"stock\": 200
  }" | python3 -m json.tool

# PRODUCTO_2="<_id del resultado>"


# ============================================================
# 4. Crear usuario con dirección embebida
# ============================================================
curl -s -X POST "$BASE_URL/api/usuarios" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Valentina Rios",
    "email": "valentina.rios@gmail.com",
    "password_hash": "Clave1234!",
    "telefono": "+57 310 456 7890",
    "direccion": {
      "calle": "Carrera 15 # 93-47 Apto 302",
      "ciudad": "Bogota",
      "departamento": "Cundinamarca",
      "pais": "Colombia",
      "cp": "110221"
    }
  }' | python3 -m json.tool

# USER_ID="<_id del resultado>"


# ============================================================
# 5. Crear pedido con 2 productos
# ============================================================
curl -s -X POST "$BASE_URL/api/pedidos" \
  -H "Content-Type: application/json" \
  -d "{
    \"usuario_id\": \"$USER_ID\",
    \"productos\": [
      { \"producto_id\": \"$PRODUCTO_1\", \"cantidad\": 1 },
      { \"producto_id\": \"$PRODUCTO_2\", \"cantidad\": 2 }
    ],
    \"metodo_pago\": \"tarjeta_credito\"
  }" | python3 -m json.tool

# PEDIDO_ID="<_id del resultado>"


# ============================================================
# 6. Listar productos con filtros
# ============================================================
curl -s -G "$BASE_URL/api/productos" \
  --data-urlencode "categoria=$CATEGORIA_ID" \
  --data-urlencode "precioMin=10000" \
  --data-urlencode "precioMax=500000" \
  --data-urlencode "page=1" | python3 -m json.tool


# ============================================================
# 7. Obtener usuario por ID
# ============================================================
curl -s "$BASE_URL/api/usuarios/$USER_ID" | python3 -m json.tool


# ============================================================
# 8. Historial de pedidos del usuario
# ============================================================
curl -s "$BASE_URL/api/usuarios/$USER_ID/pedidos" | python3 -m json.tool


# ============================================================
# 9. Cambiar estado del pedido a "enviado"
# ============================================================
curl -s -X PUT "$BASE_URL/api/pedidos/$PEDIDO_ID/estado" \
  -H "Content-Type: application/json" \
  -d '{ "estado": "enviado" }' | python3 -m json.tool


# ============================================================
# 10. Ver productos con bajo stock (umbral 10)
# ============================================================
curl -s "$BASE_URL/api/inventario/bajo-stock?umbral=10" | python3 -m json.tool


# ============================================================
# 11. Ajuste manual de inventario (entrada de stock)
# ============================================================
curl -s -X PUT "$BASE_URL/api/inventario/$PRODUCTO_1" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "entrada",
    "cantidad": 100,
    "motivo": "Reposicion de proveedor"
  }' | python3 -m json.tool


# ============================================================
# 12. Soft delete de usuario
# ============================================================
curl -s -X DELETE "$BASE_URL/api/usuarios/$USER_ID" | python3 -m json.tool


# ============================================================
# 13. ERROR esperado: stock insuficiente (cantidad 999999)
# ============================================================
curl -s -X POST "$BASE_URL/api/pedidos" \
  -H "Content-Type: application/json" \
  -d "{
    \"usuario_id\": \"$USER_ID\",
    \"productos\": [{ \"producto_id\": \"$PRODUCTO_1\", \"cantidad\": 999999 }],
    \"metodo_pago\": \"pse\"
  }" | python3 -m json.tool


# ============================================================
# 14. ERROR esperado: email duplicado (409 Conflict)
# ============================================================
curl -s -X POST "$BASE_URL/api/usuarios" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Otro Usuario",
    "email": "valentina.rios@gmail.com",
    "password_hash": "Clave5678!",
    "direccion": { "calle": "Calle 10", "ciudad": "Cali", "pais": "Colombia" }
  }' | python3 -m json.tool
