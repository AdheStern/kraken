# AGENTS.md — Kraken by DIMA (plataforma de gestión interna de DIMA Ltda.)

> Fuente de verdad para agentes de código (Claude Code, Codex y similares).
> Versión legible para personas: `docs/plan-maestro.html` (documento maestro v0.1, octubre 2026).
> Si este archivo y el código no coinciden, **gana este archivo**. Si una decisión lo contradice,
> se actualiza este archivo en el mismo PR. El producto se llama **Kraken by DIMA** ("DIMA Hub" fue el nombre provisional;
> el repositorio y algunos identificadores técnicos aún lo usan).

---

## 0. Reglas duras (leer siempre antes de escribir código)

1. **Cabecera obligatoria** en todo archivo de código: ruta + una o dos líneas de propósito.
2. **Tamaños:** componente ≤120 líneas (máx. 200) · Server Action una por archivo ≤80 (máx. 120) · schemas/queries/types ≤150 (máx. 200) · módulo de dominio ≤150 (máx. 250) · función ≤30 (máx. 50).
3. **Dinero con `Prisma.Decimal`**, nunca `number`. En `src/domain` se usa `Decimal` de `decimal.js` (la misma librería que envuelve Prisma); la conversión ocurre en `queries/` y `actions/`. Montos `NUMERIC(18,2)`, factor `NUMERIC(8,2)`, TC `NUMERIC(12,4)`.
4. **Tiempo en minutos enteros** (`Int`). Las horas con decimales son solo presentación.
5. **Fechas en UTC** (`timestamptz`); el calendario de negocio se calcula en `America/La_Paz` con date-fns-tz.
6. **Ningún saldo (horas o stock) cambia sin insertar su movimiento en la misma transacción** (`runInTransaction`). Un `UPDATE` directo a un saldo es un bug.
7. **Todo listado pasa por una función de alcance de authz** (`scope*Query(user)`). Prohibido escribir condiciones de visibilidad a mano.
8. **`src/domain` es puro:** no importa Prisma, Next.js, `src/server`, `src/features` ni llama a `Date.now()` (recibe un `Clock`).
9. Prisma solo en `queries/`, `actions/` y `src/server/`. Nunca en componentes ni en `src/domain`.
10. Las Server Actions devuelven `ActionResult`; nunca lanzan al cliente.
11. **Comentarios:** solo POR QUÉ, REGLA (con referencia a este archivo), TRAMPA o LIMITACIÓN. Cero narración, cero changelog. `TODO(nombre, #issue)` o nada.
12. Un ingeniero **nunca** recibe costos ni márgenes en el navegador, ni en campos ocultos.
13. Los casos canónicos (`tests/canon/`: PRECIO-01, HORAS-01, APROB-01) **no se editan** sin cambiar antes la sección 15 de este archivo.
14. Sin dependencias nuevas sin justificarlas en el PR. PRs < 400 líneas netas.
15. **Si algo es ambiguo, pregunta antes de asumir.** Si asumes, decláralo al inicio de tu respuesta. Al terminar una tarea, lista supuestos y dudas abiertas.
16. Las reglas marcadas **[CONFIRMAR]** están vigentes pero pendientes de validación por DIMA: impleméntalas aisladas (una función, un parámetro) para poder cambiarlas sin refactor.

### Comandos

```bash
pnpm dev                      # app en desarrollo
pnpm worker:dev               # worker pg-boss
pnpm worker:migrate           # instala/actualiza el esquema pgboss con MIGRATION_DATABASE_URL y da DML al rol de DATABASE_URL
pnpm test                     # dominio y unitarios (Vitest)
pnpm test:int                 # integración con Postgres (Testcontainers)
pnpm test:e2e                 # Playwright
pnpm biome check --write      # lint + formato
pnpm prisma migrate dev       # migraciones en desarrollo
pnpm db:seed:admin            # crea/actualiza la cuenta de emergencia ADMIN_SISTEMA desde SUPERADMIN_*
pnpm db:seed:base             # catálogos base (ciudades, áreas, roles, parámetros y la hoja "Listas"); apto para producción,
                              # solo crea lo que falta
pnpm db:seed:dev              # SOLO desarrollo: catálogos base + datos y usuarios demo (gg@, gerente.dimanet@, comercial@, comercial2@, administracion@dima.local)
                              # con DEV_SEED_PASSWORD; entrar con contraseña exige AUTH_DEV_PASSWORD_LOGIN=true
pnpm skills:install           # restaura las skills de agentes desde skills-lock.json
docker compose -f deploy/compose.dev.yml up -d   # Postgres + correo falso
```

### Glosario código ↔ negocio

| Código | Negocio |
|---|---|
| `sales-control`, `cv` | Control de Venta (CV) |
| `CvVersion` | Versión de un CV |
| `hour-bag`, `HourBag` | Bolsa de horas |
| `ledger` / `movement` | Libro mayor / movimiento |
| `pricingSource: FACTOR \| PRECIO` | Cómo se fijó el precio de la línea |
| `BagModality: H8X5 \| H24X7` | Modalidad 8x5 o 24x7 |
| `supplyMode: STOCK_DIMA` | Venta desde stock propio |
| `ticket`, `subtask`, `time-entry` | Ticket, subtarea, registro de tiempo |
| `transfer` | Traspaso entre almacenes |
| `fx` | Tipo de cambio |

---

## 1. Visión y alcance

DIMA Ltda. brinda implementación y soporte en Cisco, Huawei, Radware, Red Hat, Microsoft, IBM, AWS, HPE, Fortinet, Ricoh, Veeam, VMware, etc. Hoy el negocio vive en cientos de Excel. La plataforma centraliza el ciclo completo: **Control de Venta** y su aprobación por área, **bolsas de horas** consumidas desde tickets y proyectos, **inventario** con almacenes y traspasos, y **tableros** económicos y operativos.

### Objetivos
- Centralizar clientes, CV, proveedores, productos, horas, tickets e inventario con historial completo.
- Agilizar la asignación y el control de proyectos: ticket con un encargado, subtareas, descuento automático de horas al cierre.
- Controlar las horas vendidas: saldo exacto, multiplicador fuera de horario, alertas, nunca consumo por encima de lo vendido.
- Formalizar la aprobación en paralelo por área, con el gerente general por encima de un umbral configurable.
- Medir con tableros por rol (KPIs y KGIs).
- Controlar el inventario: almacenes por ciudad, traspasos, kardex, POS interno.

### Áreas (catálogo, no constantes)
DIMASOFT (software y licenciamiento) · DIMANET (redes, infraestructura, seguridad) · DIMATEL (comunicaciones y colaboración) · DIMADOC (gestión documental e impresión) · DIMAHELP (mesa de ayuda). Agregar un área no requiere despliegue.

### Ciudades
La Paz `LP`, Santa Cruz `SC`, Cochabamba `CB`. Cada una tiene su correlativo de CV, sus feriados departamentales, su horario de oficina y su almacén.

### Roles
| Rol | Qué hace |
|---|---|
| Gerente general | Ve todo. Aprueba CV por encima del umbral. Tableros consolidados. |
| Gerente de área | Aprueba la parte de su área. Ve CV, tickets, bolsas e ingenieros de su área. |
| Comercial (KAM/AM) | Crea y edita sus CV, elige TC, factor o precio final. Ve solo sus CV. |
| Preventa | Arma la propuesta técnica; ve los CV donde figura. |
| Ingeniero (postventa) | Encargado o ejecutor de subtareas; registra tiempos. |
| Coordinador de soporte | Crea tickets, asigna encargados, define la jerarquía de bolsas, cierra y reabre. |
| Almacén | Ingresos, salidas, traspasos, POS. |
| Administración | Consulta CV aprobados, exporta, gestiona clientes y proveedores. |
| Administrador del sistema | Usuarios, grupos de Entra, excepciones de permisos, parámetros. No ve montos por ese rol. |

Una persona puede tener varios roles; los permisos se suman.

### Módulos
Control de Venta · Horas, tickets y proyectos · Inventario y POS interno · Tableros · Administración · Notificaciones.

### Fuera de alcance en v1 (YAGNI)
Portal de clientes · integración con ERP, contabilidad o facturación · migración de los CV de ejemplo (fueron solo material de análisis) · delegación de aprobaciones (regla de negocio: si el gerente está ausente, no se aprueba) · app móvil nativa · Kubernetes y microservicios · multimoneda.

---

## 2. Reglas de negocio

### 2.1 Control de Venta (CV)

**Numeración:** `{correlativo}{ciudad}-{aa}` → `132LP-25`, `0208LP-25`, `015SC-26`.
- Correlativo por ciudad y año, asignado al **crear** el CV, nunca reutilizado (aunque se anule).
- Se genera con `cv.numerador` y bloqueo de fila (`SELECT … FOR UPDATE`), nunca con `MAX()+1`.
- Las versiones no cambian el número: `132LP-25 v2`. Sufijo `-DS`: decisión abierta.

**Cabecera:**
| Grupo | Campos |
|---|---|
| Identificación | Número, versión, título, fecha, ciudad |
| Personas | Vendedor(es) (puede haber más de uno), preventa, postventa — referencias a usuarios |
| Clasificación | Línea principal (tecnología), tipo de servicio, indicador de nueva tecnología |
| Cliente | NIT, contacto, correo, teléfono, dirección, ciudad/país (del catálogo) |
| Cliente final | Mismos datos; por defecto igual al cliente; distinto cuando DIMA vende a través de un tercero |
| Orden del cliente | N° OC, fecha OC, términos de pago, fecha de entrega, adjunto de la OC |
| Notas | Notas aclaratorias |
| Cambio | TC de costo, TC de venta, TC oficial de referencia |

Los datos de cliente y cliente final se copian en cada versión (snapshot).

**Líneas:**
| Campo | Regla |
|---|---|
| Grupo / lote | Opcional ("LOTE 1"). Subtotal propio; permite aplicar un factor a todo el grupo. |
| Área | **Obligatoria por línea** si `kind = ITEM`. Las áreas del CV = unión de las áreas de sus líneas → de ahí salen los aprobadores. |
| Proveedor + modalidad | `LOCAL`, `IMPORTACION`, `STOCK_DIMA`, `SERVICIO_PROPIO`. ("INGRAM", "INGRAM MICRO" e "INGRAM - INT" son un solo proveedor con distinta modalidad.) |
| Tecnología + tipo | Tecnología del catálogo; tipo `HARDWARE`, `INTANGIBLE` (licencias, suscripciones, soporte del fabricante) o `SERVICIO`. |
| Producto | Del catálogo o creado desde el editor del CV (marcado "creado desde CV" para revisión). |
| Código, descripción | Copiados del producto, editables. |
| Unidad, cantidad | Unidad del catálogo (`HORAS`, `MESES`, `PIEZA`, `UNIDAD`, `METROS`, `ROLLO`…). Cantidad con hasta 2 decimales. |
| Costo, factor, precio | Ver 2.2. |
| Seriales | Lista por línea. |
| Vigencia | Inicio y fin para soporte, suscripciones y licencias → tablero de renovaciones. |
| PO#, observaciones | Orden de compra al proveedor, notas técnicas. |
| Línea de nota | `kind = NOTA`, sin importe ("Initial Term - 36 Months…"). Se exporta como fila de texto. |
| Bolsa de horas | Si la unidad es `HORAS` y el tipo `SERVICIO`: modalidad, alcance, áreas o proyecto, vencimiento (`hourBagSpec`). |

**Sección de leasing o arrendamiento:** se mantiene aunque se use poco. Es una lista separada (proveedor, línea, código, descripción, cantidad, costo, notas, PO#) con su propio total de costo. No afecta la venta. Se exporta en su bloque.

**Productividad:** *Duplicar CV* (número nuevo; para los CV mensuales de licencias y Azure) · *Pegar desde Excel* en la grilla.

### 2.2 Factor, precio y tipo de cambio

Todos los CV se hacen en **USD**. Los bolivianos son siempre un valor derivado.

```
Modo FACTOR:  precio_unit_venta = redondear2(costo_unit × factor)
Modo PRECIO:  factor = redondear2(precio_unit_venta / costo_unit)   // solo si costo_unit > 0
```
- El factor tiene **como máximo 2 decimales**. Los montos tienen 2 decimales con redondeo half-up (sección 15.4).
- Cada línea guarda **ambos valores** y su `pricingSource`. En modo PRECIO el precio guardado es exactamente el ingresado; el factor es informativo y puede no reproducirlo (caso PRECIO-01).
- El factor se puede aplicar a una línea, a un grupo o a todas las líneas de una tecnología ("FACTOR CISCO").
- **Costo 0** (servicios propios, "Servicios Conexos"): solo modo PRECIO, factor `null`. Nunca mostrar `#DIV/0!`.
- Factor del CV = `total_venta / total_costo` sobre las líneas con costo > 0; el margen de servicios propios se reporta aparte.

**Tipo de cambio:**
- Dos TC **ingresados a mano** por el comercial: **TC de costo** y **TC de venta** (en las plantillas actuales, 6.97 y 6.96). La coyuntura es cambiante, por eso son manuales.
- Se muestra el **TC oficial del BCB** como referencia y se guarda en la versión (`officialFxRate`). Si el TC ingresado se desvía más de un % configurable, se muestra una advertencia sin bloquear.
- Fuente: `GET https://apibcb.cucu.bo/api/v1/tc/oficial` (sin API key, 120 consultas por hora por IP). El BCB lo publica en días hábiles hacia las 23:30 y rige al día siguiente; el del viernes cubre de sábado a lunes. Es un servicio independiente e informativo.
- **Nunca se consulta la API desde una pantalla.** Un job lo guarda en `fx.tipo_cambio`. Si falla: se muestra el último valor con su fecha y una advertencia; el administrador puede cargarlo a mano.
- Panel de TC: TC del día, vigencia, fuente, variación, serie de 90 días, TC promedio usado en los CV del mes.

```
costo_bs = redondear2(costo_total_usd × tc_costo)     // por línea, luego se suma
venta_bs = redondear2(venta_total_usd × tc_venta)
```

### 2.3 Versiones y aprobación
- Solo la versión `BORRADOR` es editable. `EN_APROBACION` y `APROBADA` son **inmutables** (trigger en la base de datos, no solo la interfaz).
- Modificar un CV aprobado crea una **versión nueva** a partir de la vigente, con motivo obligatorio, y repite el ciclo completo. Mientras tanto, la versión aprobada anterior sigue vigente para horas e inventario.
- Historial con quién y cuándo, y **comparador** línea por línea (agregadas, quitadas, modificadas, diferencia de totales).
- Aprobación **en paralelo**: una solicitud por cada área presente en las líneas, dirigida a su gerente. Todas deben aprobar.
- Si `totalSaleUsd >= umbral` (en USD, editable desde el sistema), se suma el **gerente general** en paralelo. El umbral se congela en la versión al enviarla y se evalúa por versión.
- **Sin delegación.** La solicitud espera; el tablero muestra su antigüedad.
- Rechazo (comentario obligatorio) → la versión pasa a `OBSERVADA` y las demás solicitudes pendientes de la ronda pasan a `CERRADA`; las ya decididas conservan su decisión. El comercial corrige en una versión nueva. **[CONFIRMAR]**
- Cada evento (envío, aprobación, rechazo, nueva versión, anulación) notifica por correo y en la bandeja.
- Al aprobarse: se generan las bolsas de horas (2.4) y las reservas de stock (2.8).

### 2.4 Bolsas de horas
Cada línea de horas de servicio de un CV aprobado genera una **bolsa**.

| Atributo | Regla |
|---|---|
| Modalidad | `H8X5` o `H24X7`. Define el multiplicador (2.5) y el reloj del SLA (2.7). |
| Alcance | `AREA` (una o más áreas), `PROYECTO` (un proyecto) o `GENERAL` (cualquier ticket del cliente). Si es compartida entre áreas, todas consumen **del mismo saldo**. |
| Vencimiento | Opcional. No acepta trabajo realizado después de la fecha; el saldo restante se registra como `VENCIMIENTO`. |
| Saldo | **Nunca negativo.** No se consumen más horas de las disponibles. |
| Versiones del CV | Si una versión nueva cambia las horas, al aprobarse se registra un `AJUSTE` por la diferencia con la línea aprobada anterior (no con lo vendido, para respetar los ajustes manuales). Modalidad, alcance, áreas y vencimiento se actualizan hacia adelante; los consumos hechos no se recalculan. Si la versión quita la línea, un `AJUSTE` por el saldo cierra la bolsa (`CERRADA`). Si la reducción dejaría el saldo negativo, la versión no se puede enviar. Una bolsa `VENCIDA` o `CERRADA` no se reabre: si la versión cambia sus horas, se agrega una línea nueva. |

**Libro mayor:** el saldo es la suma de movimientos inmutables `APERTURA`, `CONSUMO`, `REVERSO`, `AJUSTE`, `VENCIMIENTO`. Corregir = un movimiento nuevo. `balanceMinutes` es una caché actualizada en la misma transacción.

**Alertas:** al 80% y al 100% consumido · 30 días antes del vencimiento y el día del vencimiento · ticket abierto con horas proyectadas mayores al saldo. Destinatarios: vendedor del CV, gerentes de las áreas de la bolsa y encargados de tickets activos. Umbrales configurables.

### 2.5 Horario de oficina, feriados y multiplicador
- **Catálogo de horarios:** franjas por día de la semana (puede haber varias por día). Cada ciudad tiene un horario.
- **Catálogo de feriados:** nacionales y departamentales (por ciudad). Un feriado cuenta entero como fuera de horario.
- Bolsa **8x5**: un minuto dentro del horario descuenta 1; fuera del horario o en feriado descuenta **2**. Una hora pedida a las 20:00 descuenta 2 horas.
- Bolsa **24x7**: todo 1 a 1.
- Un intervalo que cruza el límite **se parte** (17:30–19:30 con cierre a las 18:30 = 60 min x1 + 60 min x2).
- Se aplican el horario y los feriados de la **ciudad del ticket** (no la del ingeniero).

```
ponderados = minutos_dentro × 1 + minutos_fuera × m      m = 2 si 8x5, 1 si 24x7
```

### 2.6 Tickets, tiempos y descuento
**Estructura:**
- Un ticket es de **soporte** o de **proyecto** (el proyecto es un contenedor con nombre, cliente, áreas y fechas).
- Lo crea personal interno. Tiene cliente, ciudad, área(s), prioridad, descripción y adjuntos.
- **Un solo ingeniero encargado.** El encargado crea **subtareas** y las asigna.
- Referencia **uno o más CV** (sus bolsas) en una **jerarquía ordenada** (prioridad 1, 2, 3…) que define el coordinador o el encargado. Solo bolsas `ACTIVA` del mismo cliente cuyo alcance incluya el área o el proyecto del ticket.

**Registro de tiempo:**
- Contador (iniciar, pausar, reanudar, terminar) o manual (inicio y fin).
- El contador guarda **eventos con hora del servidor** (`tickets.evento_contador`); los intervalos se derivan de ellos. Cerrar la pestaña no pierde tiempo.
- Un solo contador activo por persona. Un contador abierto más de 10 h genera una alerta al ingeniero y al encargado.
- Los registros manuales no se solapan con otros de la misma persona. Si se cargan más de 48 h después, quedan marcados como tardíos.
- El tiempo de personas distintas **se suma** (dos ingenieros 1 h en paralelo = 2 h). **[CONFIRMAR]**

**Cuantización y descuento al cierre** (`allocateTicketHours`):
1. Ordenar cronológicamente todos los intervalos del ticket (de todos los participantes y subtareas), ya partidos por horario.
2. Recorrerlos asignando **minutos reales** a las bolsas según la jerarquía: se llena la prioridad 1, al agotarse se pasa a la 2, etc. Cada minuto se pondera con la modalidad de la bolsa que lo recibe. Las fracciones de minuto ponderado se redondean hacia arriba al minuto.
3. El total ponderado del ticket se redondea **hacia arriba a múltiplos de 30 min**. La diferencia se carga a la última bolsa usada (o a la siguiente con saldo). **[CONFIRMAR hacia arriba]**
4. Se insertan los movimientos `CONSUMO` en **una sola transacción** con `SELECT … FOR UPDATE` sobre las bolsas, revalidando los saldos dentro de la transacción.
5. Lo que no alcance va a `horas.pendiente_sin_bolsa`: no se descuenta, no se pierde, y avisa al comercial y al gerente. Al asociar un CV nuevo, se puede aplicar (`applyPendingHours`).

Con el ticket abierto, la interfaz muestra el **consumo proyectado** con el mismo algoritmo (la misma función). Reabrir un ticket cerrado registra un `REVERSO` de sus consumos, que se recalculan al volver a cerrarlo. El cierre exige que no haya contadores activos.

### 2.7 SLA
- Catálogo de SLA por modalidad y prioridad: tiempo de primera respuesta y de resolución (valores pendientes de DIMA).
- 8x5: el reloj corre solo en horario de oficina. 24x7: corre siempre.
- Se pausa en `EN_ESPERA_CLIENTE`.
- Primera respuesta = primer paso a `EN_PROGRESO` o primer comentario público del encargado. Resolución = paso a `RESUELTO`.
- Cumplimiento reportado por cliente, área, ingeniero y periodo. Alerta al encargado y al coordinador al 75% del SLA.

### 2.8 Inventario y POS interno
- **Almacenes** por ciudad (LP, SC, CB) más almacenes lógicos: `TRANSITO` y, opcionalmente, demostración o repuestos.
- **Productos**: el mismo catálogo que los CV. Serializados o no.
- **Movimientos inmutables:** `INGRESO` (compra local o importación, con PO), `SALIDA` (entrega por CV o uso interno), `TRASPASO`, `AJUSTE` (requiere aprobación del gerente de área o de administración) y `DEVOLUCION`.
- **Traspaso en dos pasos:** el origen envía (el stock pasa a `TRANSITO`) y el destino recibe y confirma cantidades y seriales. Las diferencias se registran.
- **Reserva:** una línea de CV aprobado con `STOCK_DIMA` reserva stock; el despacho la consume.
- **Kardex** por producto y almacén con saldo, costo y documento de origen.
- **POS interno:** almacén → escanear o buscar código/serial → destino (CV, ticket, uso interno) → confirmar → comprobante PDF.
- Valoración: costo promedio ponderado por producto y almacén. **[CONFIRMAR]**

### 2.9 Roles y permisos
Roles asignados por grupos de Entra ID, más **excepciones por usuario** gestionadas por el administrador.

| Recurso | Comercial | Gerente de área | Gerente general | Ingeniero | Administración |
|---|---|---|---|---|---|
| CV: ver | Propios (vendedor o creador) | Con al menos una línea de su área | Todos | Solo cabecera y líneas de horas de los CV de sus tickets | Aprobados |
| CV: crear y editar borrador | Propios | Propios | Todos | No | No |
| CV: aprobar | No | Parte de su área | Sobre el umbral | No | No |
| CV: costos y margen | Propios | Su área | Todos | **Nunca** | Aprobados |
| CV: exportar Excel | Propios | Su área | Todos | No | Aprobados |
| Tickets: ver | De clientes de sus CV | De su área | Todos | Asignados o con subtarea suya | No |
| Tickets: registrar tiempo | No | Su área | No | Sus subtareas y tickets a cargo | No |
| Bolsas: ver saldo | De sus CV | De su área | Todas | De su área y de sus tickets | Todas |
| Bolsas: ajuste manual | No | Su área, con motivo | Todas, con motivo | No | No |
| Inventario | Consulta de stock | Consulta + aprobar ajustes de su área | Todo | Consulta de stock | Todo |

Almacén opera inventario y POS. El coordinador gestiona los tickets de su área. **Catálogos:** clientes, contactos, proveedores y productos los gestionan Administración y el administrador del sistema; áreas, ciudades, calendario, tecnologías, unidades, tipos de servicio, usuarios, parámetros y TC, solo el administrador del sistema. **Bolsas:** todo usuario con un rol asignado a un área (ingeniero, coordinador, preventa, gerente…) ve todas las bolsas de esa área, en cualquier estado y con su libro; ajustarlas o cerrarlas sigue siendo solo del gerente del área y del GG. El administrador del sistema gestiona usuarios, permisos y parámetros pero **no** ve montos por ese rol. **Cada fila de esta tabla es un test.**

---

## 3. Arquitectura

Monolito modular en Next.js, en dos nodos detrás de HAProxy, con un worker pg-boss y un clúster PostgreSQL con Patroni. Son 40 usuarios: la redundancia existe para no perder datos ni servicio, no por carga.

```
Usuarios ─HTTPS→ FortiGate/Radware (WAF + TLS) → IP virtual (keepalived)
  → [app-01, app-02]: HAProxy → Next.js x2 · Worker pg-boss x2
      → HAProxy de BD → Primario Postgres ─síncrona→ Réplica · → Réplica   (Patroni + etcd)
         Primario ─WAL continuo→ pgBackRest (ops-01) → NAS + Azure Blob inmutable
  Next.js → Entra ID (OIDC) · NFS del NAS (adjuntos)
  Worker  → Microsoft Graph (sendMail) · API BCB de CUCU (TC)
```

### ADRs
| # | Decisión | Por qué |
|---|---|---|
| ADR-01 | Monolito modular Next.js (App Router), un repositorio, módulos con fronteras explícitas. | Equipo pequeño; los microservicios no aportan. |
| ADR-02 | Un esquema Postgres por dominio (`core`, `cv`, `horas`, `tickets`, `inv`, `fx`, `notif`, `audit`, `auth`) con Prisma `multiSchema`. | Orden, permisos y respaldos selectivos. Prisma es el único dueño del esquema. |
| ADR-03 | Libros mayores inmutables (`horas.movimiento`, `inv.movimiento`). El saldo es una caché actualizada en la misma transacción con `SELECT … FOR UPDATE`; `CHECK (saldo >= 0)` como última red. | Auditoría, correcciones sin borrar, sin sobregiros concurrentes. |
| ADR-04 | Decimales exactos (`NUMERIC`) y `Prisma.Decimal` en TS. | Sin errores de coma flotante. |
| ADR-05 | Better Auth + Microsoft Entra ID (OIDC, inquilino único). Sesiones en BD. Grupos de Entra → roles. Email/contraseña solo para la cuenta de emergencia `ADMIN_SISTEMA` (sin registro público; el login va por `/api/auth`, no por Server Action, para que aplique el límite de intentos). | SSO, MFA y acceso condicional heredados; dar de baja en Entra corta el acceso. |
| ADR-06 | Authz centralizada en `src/server/authz`: CASL + funciones `scope*Query(user)`. | Reglas de 2.9 en un solo lugar, testeables. |
| ADR-07 | Jobs con pg-boss en un proceso worker separado (`src/worker`, registro en `job-registry.ts`). Su esquema `pgboss` queda fuera de Prisma y en producción se crea con el usuario de migraciones antes del primer arranque. | Sin Redis; los jobs sobreviven a reinicios; sin doble ejecución. |
| ADR-08 | Correo con Microsoft Graph `sendMail` (app-only) desde un buzón de servicio, limitado con RBAC para aplicaciones de Exchange. **Outbox**: la action escribe en `notif.salida` dentro de su transacción y el worker envía con reintentos. | Sin SMTP propio; ningún correo se pierde ni se envía por una transacción revertida. |
| ADR-09 | TC desacoplado: job a las 00:15 + reintentos cada hora → `fx.tipo_cambio`. Cada versión guarda TC de costo, TC de venta y TC oficial. | La API puede fallar; los CV históricos no cambian. |
| ADR-10 | Lógica de dominio pura en `src/domain` (precio, calendario, ponderación, asignación, SLA, costo promedio). | Las reglas delicadas se prueban sin BD. |
| ADR-11 | Versionado de CV por copia (cada versión con sus líneas). Un trigger bloquea cambios en versiones que no estén en `BORRADOR`. | Comparador trivial; lo aprobado no cambia ni por error. |
| ADR-12 | Exportación con ExcelJS sobre la plantilla oficial `PA-PR-03-RE-01` en `templates/`, escribiendo fórmulas. | El formato que DIMA ya usa; archivo "vivo". |
| ADR-13 | Docker Compose sobre VMs de VMware, sin Kubernetes. | La misma disponibilidad con mucha menos operación. |
| ADR-14 | Auditoría en `audit.evento` vía extensión de Prisma (actor, entidad, acción, antes, después, IP, fecha). | Trazabilidad de precios, aprobaciones y ajustes. |
| ADR-15 | Fechas UTC en BD; calendario en `America/La_Paz` (UTC−4, sin horario de verano). | Sin errores de zona horaria. |
| ADR-16 | Adjuntos en NFS del NAS montado en ambos nodos (ruta + hash en BD), copia diaria a Azure Blob, detrás de la interfaz `FileStore`. | Sin servicio de objetos adicional; migrable a S3. |

### Flujo de aprobación
1. El comercial envía la versión → la action valida permisos y reglas (líneas, TC, áreas).
2. Transacción: versión `EN_APROBACION`, umbral congelado, una solicitud por área (+GG si total ≥ umbral), correos en `notif.salida`.
3. El worker envía los correos.
4. El gerente aprueba o rechaza → si todas aprueban: versión `APROBADA` (la aprobada anterior pasa a `REEMPLAZADA`) y se generan bolsas y reservas. Si hay rechazo: `OBSERVADA` y se cierran las pendientes.
5. Se notifica al comercial.

### Flujo de cierre de ticket
1. Verificar que no haya contadores activos.
2. Leer intervalos, jerarquía de bolsas, horario y feriados.
3. `allocateTicketHours(intervalos, bolsas, calendario)` (pura) → consumos por bolsa + pendiente sin bolsa.
4. Transacción: `SELECT bolsas FOR UPDATE`, revalidar saldos, insertar `CONSUMO`, actualizar saldos, ticket `CERRADO`, outbox y auditoría.

---

## 4. Modelo de datos

PostgreSQL 16 + Prisma. Un esquema por dominio, PK `uuid` v7, `timestamptz` en UTC, borrado lógico solo en catálogos. Tablas y columnas en español `snake_case` vía `@@map`/`@map`; modelos Prisma en inglés.

Prisma 7: `prisma.config.ts` en la raíz (esquema multiarchivo en `prisma/schema/`, URL de migraciones `MIGRATION_DATABASE_URL`); el cliente se genera en `src/generated/prisma` (no versionado) y se usa solo vía `src/server/db.ts` con `@prisma/adapter-pg`. **Toda FK a una persona apunta a `core.usuario_perfil.usuario_id`** (texto, = id de Better Auth), nunca a `auth.user`.

| Esquema | Tablas |
|---|---|
| `auth` | Better Auth: `user`, `session`, `account`, `verification` (no tocar sus columnas) |
| `core` | `area`, `ciudad`, `usuario_perfil`, `rol`, `usuario_rol`, `grupo_entra_rol`, `permiso_excepcion`, `cliente`, `cliente_contacto`, `proveedor`, `tecnologia`, `unidad`, `tipo_servicio`, `producto`, `horario_oficina`, `horario_franja`, `feriado`, `parametro` |
| `fx` | `tipo_cambio` (fecha de vigencia, compra, venta, fuente, obtenido_en) |
| `cv` | `numerador`, `cv`, `version`, `version_vendedor` (vendedores N–N), `grupo`, `linea`, `linea_serial`, `leasing_linea`, `solicitud_aprobacion`, `adjunto` |
| `horas` | `bolsa`, `bolsa_area`, `movimiento`, `pendiente_sin_bolsa` |
| `tickets` | `proyecto`, `proyecto_area`, `ticket`, `ticket_area`, `ticket_bolsa` (con `prioridad`), `subtarea`, `registro_tiempo`, `evento_contador`, `comentario`, `adjunto`, `sla_politica`, `sla_medicion` |
| `inv` | `almacen`, `stock`, `unidad_serial`, `movimiento`, `movimiento_linea`, `traspaso`, `traspaso_linea`, `solicitud_ajuste` (el AJUSTE se inserta en el libro solo al aprobarse), `reserva` |
| `notif` | `salida` (outbox), `bandeja`, `preferencia` |
| `audit` | `evento` |
| `dash` | Vistas SQL de los tableros (sección 6) |

**Relaciones clave:** Cliente 1–N CV · CV 1–N Versión · Versión 1–N Línea · Versión 1–N SolicitudAprobación · Línea N–1 Área · Línea 1–0..1 Bolsa (por linaje: `linea_origen_id`) · Bolsa 1–N MovimientoHoras · Ticket 1–N TicketBolsa (prioridad) N–1 Bolsa · Ticket 1–N Subtarea · Ticket/Subtarea 1–N RegistroTiempo · Proyecto 1–N Ticket · Línea 1–N Reserva · Almacén 1–N Stock · Stock 1–N MovimientoInv.

### Extracto Prisma (núcleo)
```prisma
// prisma/schema/cv.prisma
model CvVersion {
  id                   String   @id @db.Uuid
  cvId                 String   @db.Uuid
  number               Int                              // 1, 2, 3…
  status               CvVersionStatus                  // BORRADOR | EN_APROBACION | OBSERVADA | APROBADA | REEMPLAZADA | ANULADA
  reason               String?                          // obligatorio desde la v2
  costFxRate           Decimal  @db.Decimal(12, 4)      // TC de costo, manual
  saleFxRate           Decimal  @db.Decimal(12, 4)      // TC de venta, manual
  officialFxRate       Decimal? @db.Decimal(12, 4)      // TC BCB de referencia (snapshot)
  approvalThresholdUsd Decimal? @db.Decimal(18, 2)      // congelado al enviar
  customerSnapshot     Json                             // cliente y cliente final al momento
  totalCostUsd         Decimal  @db.Decimal(18, 2)
  totalSaleUsd         Decimal  @db.Decimal(18, 2)
  submittedAt          DateTime? @db.Timestamptz
  approvedAt           DateTime? @db.Timestamptz
  lines                CvLine[]
  @@unique([cvId, number])
  @@schema("cv")
  @@map("version")
}

model CvLine {
  id            String   @id @db.Uuid
  versionId     String   @db.Uuid
  groupId       String?  @db.Uuid
  position      Int
  kind          CvLineKind                              // ITEM | NOTA
  areaId        String?  @db.Uuid                       // obligatorio si ITEM (CHECK)
  supplierId    String?  @db.Uuid
  supplyMode    SupplyMode?                             // LOCAL | IMPORTACION | STOCK_DIMA | SERVICIO_PROPIO
  itemType      ItemType?                               // HARDWARE | INTANGIBLE | SERVICIO
  productId     String?  @db.Uuid
  code          String?
  description   String
  unitId        String?  @db.Uuid
  quantity      Decimal? @db.Decimal(14, 2)
  unitCostUsd   Decimal? @db.Decimal(18, 2)
  factor        Decimal? @db.Decimal(8, 2)              // null si costo = 0
  unitSaleUsd   Decimal? @db.Decimal(18, 2)
  pricingSource PricingSource?                          // FACTOR | PRECIO
  hourBagSpec   Json?                                   // { modality, scope, areaIds, projectId, expiresOn }
  originLineId  String?  @db.Uuid                       // raíz del linaje: la hereda cada versión nueva (no un CV duplicado)
  coverageStart DateTime? @db.Date
  coverageEnd   DateTime? @db.Date
  poNumber      String?
  notes         String?
  @@schema("cv")
  @@map("linea")
}

// prisma/schema/horas.prisma
model HourBag {
  id             String   @id @db.Uuid
  cvLineId       String   @unique @db.Uuid              // línea de la versión aprobada vigente (se mueve al aprobar otra)
  customerId     String   @db.Uuid
  modality       BagModality                            // H8X5 | H24X7
  scope          BagScope                               // AREA | PROYECTO | GENERAL
  status         BagStatus                              // ACTIVA | AGOTADA | VENCIDA | CERRADA
  expiresOn      DateTime? @db.Date
  balanceMinutes Int                                    // caché; CHECK (balance_minutes >= 0)
  movements      HourMovement[]
  @@schema("horas")
  @@map("bolsa")
}

model HourMovement {
  id         String   @id @db.Uuid
  bagId      String   @db.Uuid
  kind       HourMovementKind                           // APERTURA | CONSUMO | REVERSO | AJUSTE | VENCIMIENTO
  minutes    Int                                        // con signo: + acredita, − debita
  ticketId   String?  @db.Uuid
  reversesId String?  @db.Uuid
  reason     String?
  actorId    String?                                    // null = proceso del sistema (job bags.expire)
  createdAt  DateTime @default(now()) @db.Timestamptz
  @@schema("horas")
  @@map("movimiento")
}
```

### Restricciones en la base de datos (en `prisma/sql/`, dentro de la migración correspondiente)
- `CHECK (balance_minutes >= 0)` en `horas.bolsa`; `CHECK (cantidad >= 0)` en `inv.stock`.
- Trigger `cv.bloquear_version_cerrada`: rechaza INSERT/UPDATE/DELETE de líneas, grupos, seriales, leasing y vendedores si la versión no está en `BORRADOR`. Trigger `cv.proteger_version`: fuera de `BORRADOR` solo cambian `estado` y sus marcas de tiempo.
- Triggers `horas.movimiento_inmutable`, `inv.movimiento_inmutable` y `audit.evento_inmutable`: rechazan UPDATE y DELETE.
- Índices únicos parciales (declarados en Prisma con la preview `partialIndexes`): una sola versión `APROBADA` vigente por CV; un solo registro de tiempo abierto por usuario (`fin IS NULL`).
- Unicidad con `NULLS NOT DISTINCT` (declarada con `@@unique` y recreada en `prisma/sql/`): `usuario_rol`, `grupo_entra_rol`, `feriado`, `solicitud_aprobacion`.
- Flujo: `prisma migrate dev --create-only` → agregar al final de `migration.sql` los `prisma/sql/*.sql` que correspondan → `prisma migrate dev`. Verificar con `prisma migrate diff --from-config-datasource --to-schema prisma/schema` que no haya drift.
- Exclusión con `btree_gist`: los registros de tiempo de una misma persona no se solapan.
- El usuario de BD de la aplicación no tiene `TRUNCATE`, `DROP` ni `ALTER`; las migraciones corren con otro usuario, solo en el despliegue.

---

## 5. Aplicación

### Stack
| Pieza | Elección |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Base de datos | Prisma ORM con `multiSchema` |
| Autenticación | Better Auth + proveedor Microsoft (Entra ID) |
| Autorización | CASL + funciones de alcance propias |
| UI | shadcn/ui, Tailwind, lucide-react |
| Grilla del CV | Tabla propia (`features/sales-control/components/lines`) con edición en celda, teclado, pegar desde Excel y lotes; TanStack Table solo si hace falta ordenar o virtualizar |
| Gráficos | Recharts (charts de shadcn) |
| Formularios | react-hook-form + zod |
| Fechas | date-fns + date-fns-tz |
| Decimales | `Prisma.Decimal` |
| Jobs | pg-boss en un proceso `worker` |
| Excel | ExcelJS |
| Correo | Cliente de Microsoft Graph app-only |
| Paquetes | pnpm |

### Estructura de carpetas
```
dima-hub/
├─ prisma/
│  ├─ schema/            # un .prisma por esquema (divididos por subdominio si crecen)
│  ├─ migrations/
│  └─ sql/               # triggers, CHECK, exclusiones
├─ prisma.config.ts      # configuración del CLI de Prisma 7
├─ src/
│  ├─ app/               # (auth), (app)/inicio, cv, tickets, horas, inventario, tableros, admin
│  ├─ domain/            # PURO (ADR-10)
│  │  ├─ pricing/        # factor ↔ precio, totales, Bs
│  │  ├─ calendar/       # partir intervalos por horario y feriados
│  │  ├─ hours/          # ponderación, asignación, redondeo
│  │  ├─ sla/
│  │  └─ inventory/      # costo promedio, validación de traspasos
│  ├─ features/          # un módulo por dominio, misma forma (auth/: login, Entra ID y acceso de emergencia):
│  │  └─ sales-control/
│  │     ├─ schemas/     # zod
│  │     ├─ actions/     # "use server", una por archivo
│  │     ├─ queries/     # lecturas con alcance de authz (API pública del módulo)
│  │     ├─ components/
│  │     └─ types.ts     # tipos de presentación (nunca entidades Prisma completas)
│  ├─ server/
│  │  ├─ authz/          # políticas CASL y scope*Query()
│  │  ├─ db.ts           # cliente Prisma + extensión de auditoría + runInTransaction
│  │  ├─ auth.ts         # configuración de Better Auth
│  │  ├─ auth-policies.ts # quién entra con contraseña, cuenta activa, alta del perfil
│  │  ├─ mail/           # Graph + outbox
│  │  └─ files/          # FileStore (NFS)
│  ├─ proxy.ts           # redirección optimista por cookie de sesión (Next 16: antes middleware)
│  ├─ worker/            # entrada pg-boss y handlers
│  ├─ generated/prisma/  # cliente Prisma generado (no versionado)
│  └─ components/ui/     # shadcn
├─ templates/            # PA-PR-03-RE-01.xlsx
├─ tests/canon/          # PRECIO-01, HORAS-01, APROB-01
├─ deploy/               # compose, haproxy, patroni, pgbackrest
├─ docs/plan-maestro.html
├─ AGENTS.md
└─ CLAUDE.md
```
Código y carpetas en inglés; interfaz, catálogos y tablas en español.

### Navegación
Inicio de sesión (Entra ID) → inicio según rol: GG → tablero ejecutivo; gerente de área → tablero de su área; comercial → sus CV y pipeline; ingeniero → sus tickets con el contador; almacén → POS.
- **Control de Venta:** listado → editor → historial y comparador; bandeja de aprobaciones.
- **Horas y tickets:** kanban → detalle del ticket → bolsas del cliente → libro de la bolsa; proyectos.
- **Inventario:** stock por almacén → kardex; traspasos; POS interno.
- **Tableros:** tablero por rol → detalle por indicador.
- **Administración:** catálogos, usuarios y permisos, parámetros (umbral, horarios, feriados, SLA, alertas, metas), tipo de cambio, auditoría.

### Pantallas clave
- **Editor de CV:** cabecera plegable; grilla tipo planilla agrupable por lote, con teclado y pegado desde Excel. Panel lateral fijo con totales en USD y Bs, factor global, margen, áreas involucradas y aprobadores que se generarán. Indicador FACTOR/PRECIO por línea.
- **Bandeja de aprobaciones:** pendientes con antigüedad, monto y áreas; el detalle resalta su área; comparador si es v2 o más; Aprobar / Rechazar con comentario.
- **Detalle del ticket:** encargado, SLA restante (semáforo), estado. Pestañas: subtareas, registros, bolsas (jerarquía arrastrable, saldo, consumo proyectado), comentarios, adjuntos. Contador grande.
- **Bolsas de un cliente:** tarjetas con anillo de consumo, modalidad, alcance y vencimiento; el libro enlaza al ticket que originó cada movimiento.
- **Panel de TC:** TC del día, vigencia, fuente, variación, serie de 90 días, TC promedio del mes.
- **POS interno:** una sola columna, pensado para tablet.
- Los estados vacíos y los errores dicen qué hacer ("No tienes CV en borrador. Crea uno o duplica uno anterior."), nunca solo "No hay datos".

### Exportación a Excel (plantilla `PA-PR-03-RE-01`, hoja "CONTROL DE VENTAS V2")
| Celda(s) | Contenido |
|---|---|
| `J1`, `J2`, `J3` | Código `PA-PR-03-RE-01`, fecha y revisión **del formulario** (vienen de la plantilla, no se escriben) |
| `C5` · `D5` | Número (con versión si es mayor a 1) · título |
| `C6`–`C9` | Fecha, vendedor(es), preventa, área(s) separadas por " / " |
| `J5`–`J7` | Para servicios, línea principal, nueva tecnología (`SI`/`NO`); las etiquetas están en `H5`–`H7` |
| `C10`–`C16` | Cliente, NIT, contacto, correo, teléfono, dirección, ciudad/país |
| `I11`–`I17` | Cliente final |
| `C17`–`C21` | OC, fecha OC, términos de pago, fecha de entrega, notas |
| Fila 23 | Encabezados de la plantilla |
| Fila 24 en adelante | Ítem, proveedor, línea, código, descripción, cantidad, costo unitario y total, venta unitaria y total, TC de venta, venta unitaria y total en Bs, observaciones/seriales, PO#. Primero las líneas sin lote; cada lote con una fila de nombre y subtotal (`SUM`); las notas en `E` sin número de ítem. |
| Totales | `TOTAL $us` costo, venta y Bs con `SUMIF` sobre las filas con número de ítem (los subtotales no suman dos veces); factor global sobre las líneas con costo > 0; costo Bs = suma de `ROUND(costo_total × TC costo, 2)` por línea; `H22`/`J22` apuntan a los totales |
| Leasing | Bloque desplazado según las filas insertadas; 3 filas mínimas, su propio total de costo |

Se escriben **fórmulas** redondeadas como el dominio (`=ROUND(G24*F24,2)`, `=ROUND(J24*K24,2)`…), no solo valores, con `fullCalcOnLoad`. La plantilla en blanco `templates/PA-PR-03-RE-01.xlsx` solo tiene la hoja V2, sin datos ni validaciones; las notas de ayuda del formulario se conservan. Hay un test golden (`tests/golden/`) que compara celda por celda.

---

## 6. Tableros y KPIs (propuesta a validar con gerencia)

Cada indicador tiene **una sola definición** (en `src/domain` o en una vista `dash.*`) que se reutiliza. Las metas (KGI) se configuran por área y periodo. Los CV de saldo inicial (`cv.cv.es_saldo_inicial`) no son ventas del periodo: se excluyen de los KPI económicos; sus horas sí cuentan en los operativos.

**Económicos:** ventas aprobadas (por área, comercial, cliente, tecnología, ciudad) · margen bruto en USD y % (solo costo > 0; servicios propios aparte) · factor promedio ponderado · pipeline por estado · tiempo de aprobación y pendiente más antiguo · renovaciones próximas (30/60/90 días) · horas vendidas · cumplimiento de meta.

**Operativos:** horas vendidas vs consumidas (ponderadas y reales) · bolsas en riesgo (más del 80% o vencen en menos de 30 días) · horas vencidas sin usar · horas pendientes sin bolsa · utilización por ingeniero · % de consumo fuera de horario en 8x5 · cumplimiento de SLA · tickets abiertos y mediana de resolución · % de registros tardíos · valor y rotación de inventario, traspasos en tránsito.

Las vistas `dash.*` se construyen sobre los libros mayores; se materializan solo si una consulta lo exige.

---

## 7. Contratos internos

No hay API pública. Las mutaciones son Server Actions. Los route handlers existen solo para descargas, salud y autenticación.

```ts
// src/features/sales-control/actions/submit-cv-version.ts
// Envía una versión en borrador a aprobación: genera solicitudes por área (+GG si supera el umbral).
"use server";
export async function submitCvVersion(input: SubmitCvVersionInput): Promise<ActionResult<{ requests: number }>> {
  const user = await requireUser();
  const data = submitCvVersionSchema.parse(input);
  await assertCan(user, "submit", { type: "CvVersion", id: data.versionId });
  return runInTransaction(async (tx) => { /* reglas de 2.3 */ });
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } };
```

**Actions:**
- CV: `createCv`, `duplicateCv`, `updateCvHeader`, `upsertCvLines`, `upsertCvLeasing`, `submitCvVersion`, `decideApproval`, `createCvVersion`, `voidCv`. El factor por lote o tecnología se aplica en el editor (`applyFactorToDrafts`) y lo recalcula y valida `upsertCvLines` al guardar.
- Horas: `adjustHourBag`, `closeHourBag`, `applyPendingHours`
- Tickets: `createTicket`, `assignOwner`, `setTicketBags`, `createSubtask`, `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, `addManualTimeEntry`, `changeTicketStatus`, `closeTicket`, `reopenTicket`
- Inventario: `registerReceipt`, `dispatchItems`, `createTransfer`, `sendTransfer`, `receiveTransfer`, `requestAdjustment`, `decideAdjustment`
- Administración: CRUD de catálogos (`upsertSimpleCatalogItem` y `setSimpleCatalogItemActive` para áreas, ciudades, tecnologías, unidades, tipos de servicio y proveedores; `upsertCustomer`, `upsertCustomerContact`, `upsertProduct`, `markProductReviewed` y sus bajas), usuarios (`updateUserProfile`, `setUserActive`, `grantUserRole`, `revokeUserRole`), `mapEntraGroup`, `unmapEntraGroup`, `setParameter`, `setManualFxRate`; pendiente: `grantPermissionException`
- Notificaciones: `markInboxRead`

**Route handlers:** `GET /api/cv/[versionId]/export.xlsx` (con authz) · `GET /api/inventory/receipts/[id].pdf` · `GET /api/health/live` · `GET /api/health/ready` (BD + NFS; HAProxy saca el nodo si falla) · `/api/auth/*`.

**Jobs:**
| Job | Cuándo | Qué hace |
|---|---|---|
| `fx.fetch-official` | 00:15 y cada hora hasta tener el TC vigente | API de CUCU → `fx.tipo_cambio` |
| `mail.dispatch` | Continuo | Envía `notif.salida` con reintento exponencial; tras 10 fallos alerta al administrador |
| `bags.check-thresholds` | Tras cada cierre (F3) | Consumo proyectado mayor al saldo. Los avisos de 80% y 100% no son job: se emiten en la transacción del movimiento que cruza el umbral (F2) |
| `bags.expire` | 00:05 diario (America/La_Paz) | Vence bolsas, registra `VENCIMIENTO` sin actor, avisa N días antes y el día del vencimiento, una vez cada aviso (implementado) |
| `sla.evaluate` | Cada 5 min | Mediciones y alerta al 75% |
| `timers.stale` | Cada 30 min | Contadores abiertos más de 10 h |
| `approvals.reminder` | 09:00 días hábiles | Solicitudes con más de 24 h |

**Códigos de error:** `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATE`, `INSUFFICIENT_BALANCE`, `INSUFFICIENT_STOCK`, `EXTERNAL_UNAVAILABLE`, `INTERNAL`. La interfaz traduce cada código a un mensaje que dice qué hacer.

---

## 8. Máquinas de estado

Viven en `src/domain/*/state-machine.ts`. La interfaz muestra solo las transiciones permitidas; el servidor vuelve a validar.

- **Versión de CV:** `BORRADOR → EN_APROBACION` (enviar) · `EN_APROBACION → APROBADA` (todas las áreas +GG aprueban) · `EN_APROBACION → OBSERVADA` (un rechazo; luego se crea una versión nueva en BORRADOR) · `APROBADA → REEMPLAZADA` (se aprueba una versión posterior) · `BORRADOR → ANULADA` · `APROBADA → ANULADA` (solo sin consumos ni despachos).
- **Solicitud de aprobación:** `PENDIENTE → APROBADA | RECHAZADA | CERRADA` (CERRADA si otra solicitud de la ronda fue rechazada).
- **Ticket:** `NUEVO → ASIGNADO → EN_PROGRESO ⇄ EN_ESPERA_CLIENTE` (SLA en pausa) · `EN_PROGRESO → RESUELTO` · `RESUELTO → EN_PROGRESO` (no conforme) · `RESUELTO → CERRADO` (descuento de horas) · `CERRADO → EN_PROGRESO` (reabrir con REVERSO) · `NUEVO | ASIGNADO → CANCELADO`.
- **Contador:** `CORRIENDO ⇄ PAUSADO` · `CORRIENDO | PAUSADO → TERMINADO`. Cada transición se guarda en `tickets.evento_contador` con hora del servidor.
- **Bolsa:** `ACTIVA → AGOTADA` (saldo 0) · `AGOTADA → ACTIVA` (ajuste o versión con más horas) · `ACTIVA | AGOTADA → VENCIDA` · `ACTIVA | AGOTADA → CERRADA` (manual o línea quitada en una versión). `VENCIDA` y `CERRADA` son terminales.
- **Traspaso:** `BORRADOR → EN_TRANSITO → RECIBIDO | RECIBIDO_CON_DIFERENCIAS` · `BORRADOR → CANCELADO`.

---

## 9. Principios y reglas de código

### SOLID aplicado
- **S:** una action por archivo; `split-by-business-hours.ts` solo parte intervalos.
- **O:** alertas, KPIs y tipos de job se registran en `*-registry.ts` sin tocar el motor que los ejecuta.
- **L:** `FileStore`, `MailSender` y `FxRateProvider` son intercambiables (misma firma, mismos errores).
- **I:** los componentes reciben tipos de presentación pequeños definidos en `types.ts`.
- **D:** `src/domain` recibe datos y un `Clock`; los servicios inyectan repositorios y proveedores.

### KISS / YAGNI / DRY
- KISS: monolito, pg-boss, Docker Compose, NFS.
- YAGNI: sin portal de clientes, ERP, multimoneda, delegación ni vistas materializadas prematuras.
- DRY con criterio: el mismo zod para formulario y action; la misma función de asignación para proyección y cierre. Se permite duplicar dos veces antes de abstraer.

### Patrones autorizados (otro patrón requiere justificación en el PR)
| Patrón | Dónde |
|---|---|
| Ledger (libro mayor) | `horas.movimiento`, `inv.movimiento` |
| State machine | CV, aprobación, ticket, contador, bolsa, traspaso |
| Strategy | Ponderación por modalidad, reloj de SLA, valoración de inventario |
| Policy / Specification | `src/server/authz` |
| Transactional outbox | `notif.salida` + `mail.dispatch` |
| Adapter | `GraphMailSender`, `CucuFxRateProvider`, `NfsFileStore`, `ExcelCvExporter` |
| Snapshot | Versiones de CV con datos de cliente congelados |
| Registry | Alertas, KPIs, jobs |
| Unit of Work | `runInTransaction()` |

**Anti-patrones prohibidos:** saldo sin su movimiento · `number` para dinero o factor · fechas sin zona horaria en la lógica de calendario · condiciones de visibilidad escritas a mano · lógica de negocio en componentes · Prisma en componentes o en `src/domain` · `utils.ts` cajón de sastre · barrels que re-exportan medio proyecto.

### Naming
| Elemento | Convención | Ejemplos |
|---|---|---|
| Archivos y carpetas | `kebab-case`, por lo que contienen | `allocate-ticket-hours.ts`, `cv-line-grid.tsx` |
| Componentes | `PascalCase` | `ApprovalInbox`, `HourBagRing` |
| Server Actions | verbo + objeto | `submitCvVersion`, `closeTicket` |
| Funciones puras de dominio | `compute*`, `to*`, `split*`, `allocate*` | `computeSaleFromFactor`, `splitByBusinessHours` |
| Booleanos | `is/has/can/should` | `isWithinBusinessHours`, `canApprove` |
| Unidades | sufijo obligatorio | `totalSaleUsd`, `balanceMinutes`, `saleFxRate` |
| Tablas y columnas | español `snake_case` vía `@@map`/`@map` | `horas.movimiento`, `tc_venta` |
| Enums | MAYÚSCULAS en español | `EN_APROBACION`, `STOCK_DIMA` |

Orden interno de un archivo: cabecera → imports (externos, `@/`, del propio módulo) → constantes → tipos locales → export principal → helpers privados. Un export principal por archivo. Al superar el límite, `actions.ts` pasa a `actions/` con un archivo por action y un `index.ts` que solo re-exporta.

### Cabecera
```ts
// src/domain/hours/allocate-ticket-hours.ts
// Asigna los intervalos de un ticket a sus bolsas por jerarquía, pondera por modalidad
// y redondea el total a 30 min. Regla normativa: AGENTS.md 2.6 y caso HORAS-01.
```

### Comentarios
```ts
// ❌ Calcula el factor                     ← repite el código
// ❌ Se corrigió el bug del redondeo       ← historia; va en git
// ❌ TODO: mejorar                         ← sin dueño ni issue
// ✅ POR QUÉ: en modo PRECIO guardamos el precio ingresado; el factor redondeado
//    puede no reproducirlo (caso PRECIO-01).
// ✅ TRAMPA: el feriado se evalúa en la ciudad del ticket, no la del ingeniero.
// ✅ REGLA: el redondeo a 30 min se aplica al total del ticket, nunca por intervalo (2.6).
```

### Herramientas
- **Biome**: única herramienta de lint y formato; `biome check` en CI y pre-commit (lefthook); `noExplicitAny` como error.
- **TypeScript**: strict, sin `any` (`unknown` + narrowing), tipos con `z.infer`, imports `@/`, sin `enum` de TS (uniones o enums de Prisma).
- **Fronteras**: `src/domain` no importa `src/server`, `src/features` ni `@prisma/client`. Un módulo de `features` no importa internals de otro; usa sus `queries/`.
- **Errores**: ninguna excepción silenciada; las actions devuelven `ActionResult`.
- **Migraciones**: solo con `prisma migrate`; el SQL adicional va en la misma migración; siempre compatibles hacia atrás con la versión anterior de la app (despliegue nodo a nodo).
- **Git**: trunk-based, ramas `feat/…` y `fix/…`, Conventional Commits, PRs < 400 líneas netas.
- **Dependencias**: justificadas en el PR; versiones fijadas con el lockfile de pnpm.

### Checklist antes de entregar
- [ ] Cabecera presente y veraz
- [ ] Límites de tamaño y fronteras de importación respetados
- [ ] `Decimal` para dinero, minutos enteros para tiempo
- [ ] Listados con `scope*Query`
- [ ] Cambios de saldo con su movimiento en la misma transacción
- [ ] Comentarios pasan el filtro
- [ ] Sin helpers, abstracciones ni dependencias no pedidas
- [ ] Tests de la regla tocada, con referencia al caso canónico
- [ ] Supuestos y dudas listados

---

## 10. Infraestructura y DevOps

Operación conjunta: **DIMANET** (virtualización, red, seguridad perimetral, NAS, respaldos) y **DIMASOFT** (aplicación, base de datos, CI/CD). Objetivo no negociable: **ninguna pérdida de información**.

> **Limitación actual:** un solo host ESXi y un solo NAS (con RAID, nivel por confirmar). No hay alta disponibilidad real ante la caída del host o del NAS. La redundancia interna protege contra fallas de VM, sistema operativo o proceso, y permite actualizar sin cortar el servicio. **La garantía de no perder datos es el respaldo continuo e inmutable en Azure desde el primer día.** Primera mejora recomendada: un segundo host.

### Topología
| VM | Recursos | Contenido |
|---|---|---|
| `app-01`, `app-02` | 4 vCPU · 8 GB · 60 GB | Docker Compose: Next.js, worker, HAProxy, keepalived (IP virtual) |
| `db-01` a `db-03` | 4 vCPU · 8 GB · 200 GB | PostgreSQL 16 + Patroni + etcd, `synchronous_mode: true` |
| `ops-01` | 2 vCPU · 4 GB · 300 GB | pgBackRest (NAS + Azure), Prometheus, Grafana, Loki, Uptime Kuma, runner de CI |
| `stg-01` | 4 vCPU · 8 GB · 100 GB | Staging completo con datos anonimizados |

- Aplicación activo-activo; HAProxy revisa `/api/health/ready`.
- Patroni elige y cambia el primario; la aplicación siempre se conecta por el HAProxy de BD.
- Discos de BD en datastores o LUNs distintos si es posible.
- Internet: el FortiGate o Radware publica solo el 443 hacia la IP virtual, termina TLS con certificado público y actúa como WAF. BD y operaciones no están expuestas. Acceso condicional de Entra con MFA fuera de la red.
- VLAN de aplicación y VLAN de datos separadas; solo los nodos de app y `ops-01` llegan al 5432.

### Respaldos
| Mecanismo | Frecuencia | Destino | Retención |
|---|---|---|---|
| WAL continuo (pgBackRest `archive-async`) | Segundos | NAS + Azure Blob | Toda la ventana de retención (PITR) |
| Completo | Semanal, domingo 02:00 | NAS + Azure | 8 semanas local · 12 meses Azure |
| Diferencial | Diario 02:00 | NAS + Azure | 14 días |
| Adjuntos NFS | Diario + versionado | Azure Blob | 12 meses |
| Snapshot de VMware | Antes de cada actualización | Datastore | Se borra tras validar (no es respaldo) |

- Azure Blob con **inmutabilidad (WORM)**; credenciales solo en `ops-01`, sin permiso de borrado.
- Respaldos cifrados (clave fuera del NAS).
- **Restauración de prueba mensual** automatizada en `stg-01`, verificando conteos y el último movimiento.

| Escenario | RPO | RTO |
|---|---|---|
| Cae una VM de app | 0 | Segundos |
| Cae el primario de BD | 0 (réplica síncrona) | < 1 min |
| Corrupción o borrado por error | 0 (PITR) | 1–2 h |
| Cae el host o el NAS | Segundos (último WAL en Azure) | 4 h (levantar en Azure) |

**DR en Azure (en frío):** procedimiento ensayado (Terraform o Bicep + script): crear VM con Postgres, restaurar al último WAL, levantar la app con las mismas imágenes y cambiar el DNS. Se ensaya dos veces al año.

### CI/CD
PR → biome · typecheck · tests de dominio · integración con Postgres · build → merge a main → imagen Docker etiquetada con el commit → staging + `prisma migrate deploy` + `pnpm worker:migrate` → smoke E2E → aprobación manual → producción: migración compatible hacia atrás → drenar `app-01`, actualizar, verificar → drenar `app-02`, actualizar, verificar.
- Runner autoalojado en `ops-01` (sin puertos de entrada).
- Entornos: desarrollo (Compose local con Postgres y correo falso), staging y producción.
- Observabilidad: logs JSON a Loki con `requestId`; métricas en Prometheus/Grafana; Uptime Kuma avisa por correo y Teams.

### Secretos
| Variable | Uso |
|---|---|
| `DATABASE_URL`, `MIGRATION_DATABASE_URL` | Usuario de la app (sin DDL) y usuario de migraciones |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sesiones |
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` | Inicio de sesión (permisos delegados). URI de redirección en Entra: `{BETTER_AUTH_URL}/api/auth/callback/microsoft`. Configuración de token: notificación `groups` (grupos de seguridad, token de id, Id. de grupo); cada grupo se mapea a rol + área en `/admin/grupos-entra` y los roles de origen ENTRA se recalculan en cada inicio de sesión (`src/server/entra/sync-entra-roles.ts`) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | Solo los lee `pnpm db:seed:admin` (contraseña de 12+ caracteres); la app nunca los usa |
| `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `MAIL_SENDER` | Correo (registro de app separado, solo `Mail.Send`, limitado al buzón) |
| `FX_API_URL` | API del tipo de cambio |
| `FILES_ROOT` | Punto de montaje NFS |

Nunca en el repositorio (`.env.example` documentado). En los servidores: archivos con permisos 600 fuera del proyecto o Docker secrets. Los secretos de Entra se rotan con una alerta 30 días antes de vencer.

---

## 11. Testing

| Nivel | Herramienta | Cubre |
|---|---|---|
| Dominio | Vitest | Precio y factor, partición por horario y feriados, ponderación, asignación y redondeo, aprobadores, SLA, máquinas de estado. **Mínimo 95% en `src/domain`.** |
| Propiedades | fast-check | Consumos ≤ saldo; partir y volver a sumar conserva los minutos; el redondeo nunca reduce el total. |
| Integración | Vitest + Testcontainers | Actions con authz, triggers, CHECK, exclusión de solapamientos, outbox. |
| Concurrencia | Testcontainers | Dos cierres simultáneos sobre la misma bolsa: uno gana; nunca saldo negativo. |
| Autorización | Vitest (tabla de casos) | Cada fila de 2.9. |
| Golden | Vitest + ExcelJS | Exportación celda por celda. |
| E2E | Playwright | CV → aprobación en paralelo → bolsa → ticket con contador → cierre con descuento. OIDC de prueba en CI. |
| Recuperación | Script mensual | Restaurar el respaldo en staging y verificar. |

---

## 12. Roadmap

Duraciones estimadas para un desarrollador asistido por Claude; DIMANET prepara la infraestructura en paralelo durante F0. [OPUS] = diseño o lógica delicada; [SONNET] = implementación sobre un patrón existente.

**F0 · Fundaciones e infraestructura (~3 semanas)**
- VMs, VLANs, Patroni + etcd, HAProxy + keepalived, pgBackRest a NAS y Azure, publicación por FortiGate/Radware [OPUS diseño, SONNET archivos]
- Repositorio, tooling (Biome, lefthook, Vitest, Playwright), CI con runner, Compose de desarrollo [SONNET]
- Esquemas `auth` y `core`, Better Auth + Entra, grupos → roles, authz con los tests de 2.9 [OPUS]
- Auditoría, outbox + Graph, job de TC y panel [SONNET]
- Catálogos base con carga inicial desde la hoja "Listas" de las plantillas [SONNET] — `pnpm db:seed:base` (unidades, áreas, tecnologías y tipos de servicio; sin "Ninguno", sin el área "Otro / Externo" y sin las listas de personas, que entran por Entra ID)
- *Sale cuando:* login con cuenta de DIMA, TC del día visible, correo de prueba recibido y restauración en staging funcionando.

**F1 · Control de Venta (~4 semanas) · primera salida a producción**
- `src/domain/pricing` con PRECIO-01 y redondeos [OPUS]
- Esquema `cv`, numerador, triggers [OPUS]
- Editor: cabecera, grilla con lotes, pegar desde Excel, totales, duplicar, leasing [SONNET]
- Versiones, comparador, aprobación en paralelo con umbral (APROB-01) [OPUS reglas, SONNET UI]
- Exportación a Excel con test golden [SONNET]
- Listados con alcance, bandeja de aprobaciones, notificaciones [SONNET]
- *Sale cuando:* los comerciales crean CV reales, los gerentes los aprueban y administración acepta el Excel. Se deja de crear CV en Excel.

**F2 · Bolsas de horas y calendario (~2 semanas)**
- `src/domain/calendar` con pruebas de propiedades [OPUS]
- Esquema `horas`, libro, bolsas al aprobar, ajustes por versión [OPUS]
- Catálogos de horarios y feriados, vistas de bolsas, alertas [SONNET]
- Carga de bolsas vigentes al arranque [SONNET]
- *Sale cuando:* cada CV aprobado con horas tiene su bolsa con saldo y alertas, y las bolsas vigentes están cargadas.

**F3 · Tickets, tiempos y SLA (~4 semanas) · segunda salida a producción**
- `allocateTicketHours` (HORAS-01 + propiedades) [OPUS]
- Cierre transaccional con bloqueo, test de concurrencia, reapertura con reversos [OPUS]
- Tickets, proyectos, subtareas, kanban, detalle, jerarquía arrastrable [SONNET]
- Contador por eventos, registros manuales, contadores olvidados [SONNET]
- SLA: políticas, reloj, pausas y alertas [OPUS reloj, SONNET UI]
- *Sale cuando:* los ingenieros registran todo en tickets y gerencia valida el descuento contra un cálculo manual en al menos 10 tickets reales.

**F4 · Inventario y POS (~3–4 semanas)**
- Esquema `inv`, libro, costo promedio, seriales, reservas [OPUS]
- Ingresos, salidas, traspasos en dos pasos, ajustes con aprobación, kardex [SONNET]
- POS para tablet con lector y comprobante PDF [SONNET]
- Toma de inventario inicial [operación]
- *Sale cuando:* el stock del sistema coincide con el conteo físico en los tres almacenes.

**F5 · Tableros y KPIs (~2–3 semanas)**
- Taller con gerencia: KPIs, KGIs y metas [negocio]
- Vistas `dash.*` con tests de cálculo [OPUS]
- Tableros por rol, filtros, exportación [SONNET]
- *Sale cuando:* cada gerente usa su tablero en la reunión semanal.

**F6 · Endurecimiento y continuidad (~2 semanas)**
- Revisión de seguridad (authz, cabeceras, sesiones, permisos de Graph y de BD) [OPUS]
- Ensayo completo de DR en Azure midiendo el RTO real [OPUS + DIMANET]
- Manuales cortos por rol y videos [SONNET]
- *Sale cuando:* el sistema se recupera en Azure dentro del RTO y gerencia firma la aceptación.

---

## 13. Cómo trabajar en este repositorio (agentes)

- Antes de una tarea, ubica su fase y tarea en la sección 12 y lee las secciones de reglas que aplican.
- Una tarea del roadmap por sesión. Si la tarea toca otra fase, detente y avisa.
- Las tareas [OPUS] tocan lógica delicada: propón primero el diseño, las interfaces y los tests; implementa tras la confirmación.
- Nunca fusiones código de `src/domain` sin sus casos canónicos pasando.
- Ante un bug: primero un test que lo reproduzca, después el arreglo.
- Entrega: archivos completos + tests + supuestos tomados + dudas abiertas.
- Si una decisión contradice este archivo, propón el cambio a este archivo en el mismo PR.

---

## 14. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un solo host y un solo NAS | ALTO | Respaldo continuo e inmutable en Azure desde F0, DR ensayado, discos de BD separados, propuesta de un segundo host |
| Reglas de horas mal entendidas | ALTO | Casos canónicos validados por gerencia antes de F3; validación manual en tickets reales |
| Resistencia a dejar el Excel | ALTO | Grilla tipo planilla, pegar desde Excel, duplicar CV, exportación idéntica; un comercial piloto en F1 |
| Registro tardío de tiempos | MEDIO | Contador visible, alerta de contadores olvidados, indicador de registros tardíos |
| Catálogos sucios | MEDIO | Proveedor separado de modalidad, marca "creado desde CV", revisión periódica |
| Crecimiento del alcance | MEDIO | Fases con criterio de salida; lo nuevo entra al roadmap |
| Permiso de correo demasiado amplio | MEDIO | RBAC de Exchange limitado al buzón; registro de app separado |
| Caída o cambio de la API de TC | BAJO | TC guardado, carga manual, interfaz `FxRateProvider` |

**Decisiones abiertas (no implementar como definitivas; aislarlas en parámetros):**
- **F0:** nivel de RAID del NAS; repositorio Git. Qué roles operativos llevan área (`role-area-rules.ts`: el gerente de área la exige; comercial, preventa, ingeniero y coordinador la admiten). Pendiente de la administración: excepciones de permisos (requieren CASL) y visor de auditoría (requiere la extensión de ADR-14). Los roles de Entra se recalculan solo al iniciar sesión: sacar a alguien de un grupo rige cuando su sesión vence o vuelve a entrar (duración de sesión por decidir). Deuda: el worker existe (F2, `bags.expire`), pero faltan `mail.dispatch` con Graph y `fx.fetch-official`; hasta entonces los correos esperan en `notif.salida`.
- **F1:** significado del sufijo `-DS`; confirmar que un rechazo cierra la ronda; valor inicial del umbral del GG; % de desvío del TC que dispara la advertencia.
- **F2:** horario real de cada ciudad (¿con pausa de mediodía?) y feriados departamentales y de traslado: los carga el administrador en `/admin/calendario`. *Confirmado por DIMA (2026-10-14):* multiplicador 2 fuera de horario en 8x5, umbrales de alerta 80% y 100%, aviso de vencimiento a 30 días, y los miembros de un área ven todas sus bolsas. *Resuelto:* las bolsas vigentes se cargan con un "CV de saldo inicial" por cliente (`es_saldo_inicial`, solo horas de servicio con costo y venta 0), aprobado por su gerente.
- **F3:** confirmar el redondeo hacia arriba; confirmar que se suman los tiempos en paralelo; prioridades de ticket y tiempos de SLA por prioridad y modalidad.
- **F4:** método de valoración (propuesto: costo promedio ponderado); productos que exigen serial; almacenes exactos.
- **F5:** KPIs, KGIs y metas definitivas.

---

## 15. Especificaciones cerradas (casos canónicos → `tests/canon/`)

### 15.1 PRECIO-01 — factor y precio final
TC de costo 6.97, TC de venta 6.96. Cantidad 1.

| Línea | Entrada | Costo unit. USD | Factor | Venta unit. USD | Venta unit. Bs | Costo unit. Bs |
|---|---|---|---|---|---|---|
| L1 (FACTOR) | factor 2.92 | 337.59 | 2.92 | 985.76 | 6,860.89 | 2,353.00 |
| L2 (PRECIO) | precio 130.80 | 45.22 | 2.89 | 130.80 | 910.37 | 315.18 |
| L3 (servicio propio) | precio 269.12 | 0.00 | null | 269.12 | 1,873.08 | 0.00 |

```
L1  337.59 × 2.92 = 985.7628 → 985.76
    985.76 × 6.96 = 6,860.8896 → 6,860.89     337.59 × 6.97 = 2,353.0023 → 2,353.00
L2  130.80 / 45.22 = 2.89252… → 2.89
    comprobación 45.22 × 2.89 = 130.69 ≠ 130.80 → se guarda 130.80
    UI: "Precio ingresado; el factor 2.89 es aproximado"
L3  costo 0 → factor null; no participa del factor global; margen como servicio propio
Factor global (L1 + L2) = 1,116.56 / 382.81 = 2.9167 → 2.92
```

### 15.2 HORAS-01 — ticket nocturno con dos bolsas
Ticket de un cliente en La Paz. Horario de ejemplo: lunes a viernes 08:30–18:30, sin franja el fin de semana. Jerarquía: P1 = bolsa 8x5 de `132LP-25` con 180 min; P2 = bolsa 8x5 de `041LP-26` con 600 min.

| Quién | Registro | Partición | Reales | Ponderados |
|---|---|---|---|---|
| Ing. A (encargado) | Vie 16/10/2026: inicia 17:30, pausa 18:00, reanuda 18:15, termina 19:30 | 17:30–18:00 dentro · 18:15–18:30 dentro · 18:30–19:30 fuera | 105 | 30 + 15 + 120 = 165 |
| Ing. B (subtarea) | Sáb 17/10/2026: 10:00–10:40 | todo fuera | 40 | 80 |
| **Total** | | | **145** | **245** |

Asignación cronológica:
1. 17:30–18:00 → P1: 30 (quedan 150)
2. 18:15–18:30 → P1: 15 (quedan 135)
3. 18:30–19:30 → P1: 120 (quedan 15)
4. Sábado 10:00–10:40 (80 ponderados) → P1 toma 15 (queda en 0); los 65 restantes van a P2

Redondeo: 245 → **270** (múltiplo de 30 hacia arriba); la diferencia de 25 se carga a la última bolsa usada (P2).

| Bolsa | Movimiento | Saldo final | Efecto |
|---|---|---|---|
| `132LP-25` (P1) | CONSUMO −180 | 0 | AGOTADA, alerta de 100% |
| `041LP-26` (P2) | CONSUMO −90 | 510 | — |

Total descontado: 270 min (4.5 h) por 145 min reales.

**Modalidades mezcladas:** la asignación avanza sobre minutos **reales** y pondera con la modalidad de la bolsa que los recibe. Si P2 fuera 24x7: al agotarse P1 quedan 32.5 min reales del sábado (65 ponderados ÷ 2), que en 24x7 valen 32.5 → 33 (hacia arriba al minuto). El redondeo a 30 se aplica una sola vez, sobre el total del ticket.

### 15.3 APROB-01 — aprobación en paralelo con umbral
Umbral del GG = 50,000 USD.

| Versión | Líneas | Total | Solicitudes | Resultado |
|---|---|---|---|---|
| `210LP-26 v1` | DIMANET 38,000 · DIMATEL 24,500 | 62,500 | Gte. DIMANET · Gte. DIMATEL · GG | DIMANET aprueba, GG aprueba, DIMATEL rechaza → v1 `OBSERVADA`; las decisiones previas se conservan y ninguna queda pendiente |
| `210LP-26 v2` | DIMANET 38,000 · DIMATEL 10,000 | 48,000 | Gte. DIMANET · Gte. DIMATEL (sin GG) | Ambos aprueban → v2 `APROBADA`; v1 queda en el historial |

DIMANET vuelve a aprobar en la v2: cada versión tiene su ciclo completo. El umbral se evalúa por versión.

### 15.4 Redondeos y precisión (normativo)
| Magnitud | Almacenamiento | Regla |
|---|---|---|
| Montos USD y Bs | `NUMERIC(18,2)` | Half-up a 2 decimales **por línea**; los totales son la suma de las líneas ya redondeadas |
| Factor | `NUMERIC(8,2)` | Máximo 2 decimales; en modo PRECIO, half-up del cociente |
| Tipo de cambio | `NUMERIC(12,4)` | Se guarda como se ingresa (hasta 4 decimales); se muestra con 2 salvo que tenga más |
| Cantidad | `NUMERIC(14,2)` | Hasta 2 decimales |
| Tiempo | Minutos enteros | Fracción de minuto ponderado → hacia arriba; total del ticket → hacia arriba a múltiplo de 30 |
| Horas de una bolsa | Minutos enteros | 20 horas = 1,200 minutos |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
