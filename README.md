# Tienda Virtual Escalable — MongoDB 4.0

**Proyecto Final — Bases de Datos No Relacionales**  
Universidad de Caldas · Ingeniería de Sistemas y Computación

---

## Tecnologías

| Tecnología | Versión | Función |
|---|---|---|
| Node.js | ≥ 14 | Entorno de ejecución |
| Express | 4.18 | API REST |
| Mongoose | 7.6 | ODM para MongoDB |
| MongoDB | 4.0 | Base de datos NoSQL |
| bcryptjs | 2.4 | Hash de contraseñas |
| dotenv | 16.3 | Variables de entorno |
| cors | 2.8 | Control de acceso HTTP |

---

## Instalación

```bash
# 1. Clonar o descomprimir el proyecto
cd tienda-virtual

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu URI de MongoDB y demás valores

# 4. Iniciar el servidor
npm run dev      # Desarrollo (con nodemon)
npm start        # Producción
```

---

## Estructura del proyecto

```
tienda-virtual/
├── index.js                    # Punto de entrada
├── package.json
├── .env.example                # Plantilla de variables de entorno
├── .gitignore
│
├── src/
│   ├── config/
│   │   └── db.js               # Conexión MongoDB con reconexión automática
│   │
│   ├── models/
│   │   ├── Categoria.js        # 50 documentos
│   │   ├── Usuario.js          # 500.000 documentos
│   │   ├── Producto.js         # 300.000 documentos
│   │   ├── Inventario.js       # 300.000 documentos (1:1 con Producto)
│   │   └── Pedido.js           # 699.950 documentos
│   │
│   ├── routes/                 # (implementar en Día 2)
│   ├── controllers/            # (implementar en Día 2)
│   └── middlewares/
│       └── errorHandler.js     # Manejo global de errores
│
└── scripts/                    # Scripts de inserción masiva (Día 2)
    ├── categorias-seed.js
    ├── usuarios-seed.js
    ├── productos-seed.js
    └── pedidos-seed.js
```

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Información de la API |
| GET | `/health` | Estado del servidor y BD |

> Los endpoints CRUD se implementan en el Día 2 del proyecto.

---

## Scripts de datos masivos

```bash
# Ejecutar en orden (cada script depende del anterior)
npm run seed:categorias   # Inserta 50 categorías → genera categorias-ids.json
npm run seed:productos    # Inserta 300.000 productos → requiere categorias-ids.json
npm run seed:usuarios     # Inserta 500.000 usuarios
npm run seed:pedidos      # Inserta ~700.000 pedidos → requiere productos e usuarios
```

---

## Distribución de documentos

| Colección | Documentos | % del total |
|---|---|---|
| categorias | 50 | 0,003% |
| productos | 300.000 | 20,00% |
| inventario | 300.000 | 20,00% |
| usuarios | 500.000 | 33,33% |
| pedidos | 699.950 | 46,66% |
| **TOTAL** | **1.500.000** | **100%** |
