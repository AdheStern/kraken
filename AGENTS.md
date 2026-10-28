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
pnpm migrate:deploy           # despliegue: prisma migrate deploy + worker:migrate + db:seed:base (lo corre deploy.sh)
pnpm typecheck                # next typegen + tsc (los tipos de rutas de Next se generan antes)
pnpm test                     # dominio y unitarios (Vitest)
pnpm test:int                 # integración con Postgres (Testcontainers)
pnpm build && pnpm test:e2e   # Playwright sobre el build (puerto 3100); sesiones por rol emitidas en la base
pnpm biome check --write      # lint + formato
pnpm prisma migrate dev       # migraciones en desarrollo
pnpm db:seed:admin            # crea/actualiza la cuenta de emergencia ADMIN_SISTEMA desde SUPERADMIN_*
pnpm db:seed:base             # catálogos base (ciudades, áreas, roles, parámetros y la hoja "Listas"); apto para producción,
                              # solo crea lo que falta
pnpm db:seed:dev              # SOLO desarrollo: catálogos base + datos y usuarios demo (gg@, gerente.dimanet@, comercial@, comercial2@, administracion@, coordinador@, ingeniero@, ingeniero2@dima.local; tickets de ejemplo; ventas y metas demo para los tableros)
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
Control de Venta · Horas, tickets y proyectos · Inventario y POS interno · Documentación por proyecto · Tableros · Administración · Notificaciones.

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
- Referencia **uno o más CV** (sus bolsas) en una **jerarquía ordenada** (prioridad 1, 2, 3…) que define el coordinador o el encargado. Solo bolsas `ACTIVA` del mismo cliente cuyo alcance incluya el área o el proyecto del ticket. Al crearlo se puede elegir su primera bolsa (opcional); con ella, la modalidad del SLA es la de esa bolsa (2.7).

**Registro de tiempo:**
- Contador (iniciar, pausar, reanudar, terminar) o manual (inicio y fin).
- El contador guarda **eventos con hora del servidor** (`tickets.evento_contador`); los intervalos se derivan de ellos. Cerrar la pestaña no pierde tiempo.
- Un solo contador activo por persona. Un contador abierto más de 10 h genera una alerta al ingeniero y al encargado.
- Los registros manuales no se solapan con otros de la misma persona. Si se cargan más de 48 h después, quedan marcados como tardíos.
- El tiempo de personas distintas **se suma** (dos ingenieros 1 h en paralelo = 2 h), confirmado por DIMA.

**Cuantización y descuento al cierre** (`allocateTicketHours`):
1. Ordenar cronológicamente todos los intervalos del ticket (de todos los participantes y subtareas), ya partidos por horario.
2. Recorrerlos asignando **minutos reales** a las bolsas según la jerarquía: se llena la prioridad 1, al agotarse se pasa a la 2, etc. Cada minuto se pondera con la modalidad de la bolsa que lo recibe. Las fracciones de minuto ponderado se redondean hacia arriba al minuto, una vez por bolsa (el tiempo se calcula con la precisión del servidor). Una bolsa no recibe trabajo realizado después de su vencimiento.
3. El total ponderado del ticket se redondea **siempre hacia arriba a múltiplos de 30 min** (confirmado por DIMA; el paso es el parámetro `horas.redondeo_minutos`). La diferencia se carga a la última bolsa usada (o a la siguiente con saldo); lo que no cabe en ninguna se perdona: no es trabajo real y no va a pendiente.
4. Se insertan los movimientos `CONSUMO` en **una sola transacción** con `SELECT … FOR UPDATE` sobre las bolsas, revalidando los saldos dentro de la transacción.
5. Lo que no alcance va a `horas.pendiente_sin_bolsa`: no se descuenta, no se pierde, y avisa al comercial y al gerente. Al asociar un CV nuevo, se puede aplicar (`applyPendingHours`): se pondera con la modalidad de la bolsa que lo recibe, sin nuevo redondeo.

Con el ticket abierto, la interfaz muestra el **consumo proyectado** con el mismo algoritmo (la misma función). Reabrir un ticket cerrado (con motivo) registra un `REVERSO` de sus consumos, que se recalculan al volver a cerrarlo, y descarta su pendiente sin bolsa (aplicado o no; el rastro queda en el libro y en la auditoría). Si una bolsa ya está `VENCIDA` o `CERRADA`, su consumo queda **firme**: no se revierte y, al volver a cerrar, recibe primero esos mismos minutos sin descontarse otra vez. El cierre exige que no haya contadores activos ni pausados. Cierran y reabren el coordinador o el gerente de un área del ticket y el GG; el encargado lo deja en `RESUELTO`. Crean tickets y asignan el encargado los mismos que cierran; el encargado ordena las bolsas y crea subtareas. Cada cambio de estado queda en `tickets.evento_estado` (inmutable). Iniciar el contador en un ticket `ASIGNADO` lo pasa a `EN_PROGRESO`. Los adjuntos (hasta 20 MB) los suben quienes trabajan o gestionan el ticket y van a SharePoint (ADR-16); los quita quien los subió o quien cierra el ticket, mientras no esté cerrado.

### 2.7 SLA
- Catálogo de SLA por modalidad y prioridad (`/admin/sla`): tiempo de primera respuesta y de resolución. Valores confirmados por DIMA, iguales en 8x5 y 24x7: crítica 30 min / 4 h, alta 1 h / 8 h, media 4 h / 24 h, baja 8 h / 40 h. Sin política activa no se mide.
- 8x5: el reloj corre solo en horario de oficina. 24x7: corre siempre. La modalidad se elige al crear el ticket; con bolsas, es la de la bolsa de prioridad 1 y se actualiza al cambiar la jerarquía (confirmado por DIMA, 2026-10-28).
- Corre en `NUEVO`, `ASIGNADO` y `EN_PROGRESO`; se pausa en `EN_ESPERA_CLIENTE` y no corre con el ticket resuelto, cerrado o cancelado. Se recalcula siempre desde `tickets.evento_estado` (`computeSla`, pura); `sla_medicion` es su caché.
- Primera respuesta = primer paso a `EN_PROGRESO` o primer comentario público del encargado. Resolución = último paso a `RESUELTO`; si el cliente no está conforme, el reloj se reanuda desde lo acumulado. Resolver sin pasar por `EN_PROGRESO` también cumple la primera respuesta.
- Cumplimiento reportado por cliente, área, ingeniero y periodo. Alerta al encargado y a los coordinadores del área al 75% del SLA (parámetro `sla.alerta_pct`), una sola vez por medición.

### 2.8 Inventario y POS interno
- **Almacenes** por ciudad (LP, SC, CB) más almacenes lógicos: `TRANSITO` y, opcionalmente, demostración o repuestos. Un solo físico activo por ciudad (ahí se reserva) y un solo `TRANSITO`; los gestiona el administrador del sistema en `/admin/almacenes`.
- **Productos**: el mismo catálogo que los CV. Serializados o no (`producto.serializado`): un serializado se mueve de a una unidad con su serial. Un código que no existe al registrar un ingreso crea el producto «por revisar» (`creado_desde_inventario`) para Administración.
- **Movimientos inmutables:** `INGRESO` (compra local, importación o inventario inicial, con PO), `SALIDA` (a una línea de CV, a un ticket abierto o a uso interno con motivo), `TRASPASO`, `AJUSTE` (requiere aprobación) y `DEVOLUCION` (de una salida previa, total o parcial). Cada movimiento afecta un solo almacén; cada línea guarda cantidad y valor con signo y el saldo tras ella (es el kardex). Una clave de idempotencia impide registrar dos veces el mismo comprobante.
- **Traspaso en dos pasos:** el origen envía (sale al promedio, solo lo disponible, y entra a `TRANSITO` con ese valor, que queda en la línea) y el destino recibe y confirma cantidades y seriales, en una o varias recepciones. Lo que no llega queda en `TRANSITO` como diferencia hasta que llega o se da de baja con un ajuste aprobado; se valoriza siempre contra lo que envió su línea, nunca contra el promedio de `TRANSITO` (decisión de 2026-10-21).
- **Reserva:** al aprobarse una versión, sus líneas `STOCK_DIMA` (con producto del catálogo) crean, ajustan, re-enlazan o liberan su reserva por linaje en el almacén físico de la ciudad del CV; el despacho la consume y una devolución la reabre. Si falta stock se reserva igual (el disponible queda negativo, «faltante») y se avisa a Almacén y al comercial; el editor lo advierte sin bloquear. Al aprobar nunca se lanza por inventario: sin almacén en la ciudad no se reserva y se avisa; si ya se despachó más de lo que pide la versión, se recorta y se avisa. Al enviar, una versión no baja de lo despachado. Lo reservado tiene su propio libro inmutable (`inv.reserva_movimiento`, regla 6). Un CV de saldo inicial no reserva.
- **Ajuste:** se pide (`MANUAL`, `CONTEO` o `TRASPASO`) y entra al libro solo al aprobarse, revalidado contra el stock del momento; lo decide el gerente del área de la solicitud, Administración o el GG, nunca quien lo pidió. Lo que entra vale al promedio vigente o, sin stock, al costo indicado.
- **Conteo físico:** completo (lo no contado es faltante) o parcial; se compara con la foto del sistema reconstruida desde el libro al empezar y pide un ajuste por el delta (en serializados, por seriales). Sin diferencias no pide nada: es la verificación del criterio de salida.
- **Kardex** por producto y almacén con saldo, costo y documento de origen. Costos y kardex solo para Almacén, Administración, GG y gerente de área; comercial e ingeniero consultan cantidades. Quien ve un ticket ve los materiales que se le despacharon (neto de devoluciones, con sus seriales y sin costos).
- **POS interno:** almacén → escanear o buscar código/serial → destino (CV, ticket, uso interno) → confirmar → comprobante PDF (sin costos). Quien solo tiene el rol Almacén entra directo al POS.
- Valoración: costo promedio ponderado por producto y almacén, llevado como cantidad + valor total (`NUMERIC(18,2)`); el promedio se deriva y la última unidad que sale se lleva el resto, sin centavos huérfanos (confirmado por DIMA, 2026-10-22).

### 2.9 Roles y permisos
Roles asignados por grupos de Entra ID, más **excepciones por usuario** gestionadas por el administrador: roles asignados a mano.

| Recurso | Comercial | Gerente de área | Gerente general | Ingeniero | Administración |
|---|---|---|---|---|---|
| CV: ver | Propios (vendedor o creador) | Con al menos una línea de su área | Todos | Solo cabecera y líneas de horas de los CV de sus tickets | Aprobados |
| CV: crear y editar borrador | Propios | Propios | Todos | No | No |
| CV: aprobar | No | Parte de su área | Sobre el umbral | No | No |
| CV: costos y margen | Propios | De todo el CV si tiene una línea de su área (decisión 2026-10-24) | Todos | **Nunca** | Solo versiones aprobadas o reemplazadas (y solo esas versiones ve) |
| CV: exportar Excel | Propios | Su área | Todos | No | Aprobados |
| Tickets: ver | De clientes de sus CV | De su área | Todos | Asignados o con subtarea suya | No |
| Tickets: registrar tiempo | No | Su área | No | Sus subtareas y tickets a cargo | No |
| Tickets: crear y asignar encargado | No | Su área | Todos | No | No |
| Tickets: cerrar y reabrir | No | Su área | Todos | No | No |
| Bolsas: ver saldo | De sus CV | De su área | Todas | De su área y de sus tickets | Todas |
| Bolsas: ajuste manual | No | Su área, con motivo | Todas, con motivo | No | No |
| Inventario | Consulta de stock | Consulta + aprobar ajustes de su área | Todo | Consulta de stock | Todo |
| Tableros | Ventas propias | Ventas, operación e inventario de su área; metas de su área | Todo; todas las metas y la de la empresa | Operación propia (sin montos) | Ventas aprobadas, inventario y metas (sin editarlas) |
| Documentación: ver, crear proyectos, editar cabecera y subir | Todos | Todos | Todos | Todos | Todos |
| Documentación: escribir y editar lecciones aprendidas | Todas | Todas | Todas | Todas | Todas |
| Documentación: quitar un documento | Los que subió | Los que subió | Los que subió | Los que subió | Los que subió |

Almacén opera inventario y POS y ve el tablero de inventario; el coordinador ve el operativo de su área. El coordinador gestiona los tickets de su área y, como el gerente de área, los cierra y reabre. **Catálogos:** clientes, contactos, proveedores y productos los gestionan Administración y el administrador del sistema; áreas, ciudades, calendario, tecnologías, unidades, tipos de servicio, usuarios, parámetros y TC, solo el administrador del sistema. **Bolsas:** todo usuario con un rol asignado a un área (ingeniero, coordinador, preventa, gerente…) ve todas las bolsas de esa área, en cualquier estado y con su libro; ajustarlas o cerrarlas sigue siendo solo del gerente del área y del GG. El administrador del sistema gestiona usuarios, permisos y parámetros pero **no** ve montos por ese rol; también gestiona las fases de documentación y quita cualquier documento (2.10). **Cada fila de esta tabla es un test.**

### 2.10 Documentación por proyecto
Además del CV y del soporte, DIMA documenta sus proyectos por **fases**. No se profundiza como en CV o tickets: en cada fase se suben documentos y se escriben lecciones aprendidas.
- **Fases:** catálogo `doc.fase` con orden, que gestiona el administrador del sistema en `/admin/fases-documentacion` (crear, renombrar, ordenar, dar de baja). Sin carga inicial: hoy son 4 y las define DIMA. Una fase dada de baja no admite subidas; si tiene documentos, se siguen viendo.
- **Proyecto de documentación** (`doc.proyecto`, distinto de `tickets.proyecto`): nombre y una cabecera con cliente (catálogo), contacto (un contacto del cliente prellena nombre, correo y teléfono, que quedan editables), tecnologías (catálogo, varias) y encargado (usuario). Sin montos, sin estado ni correlativo.
- **Documentos:** cada uno pertenece a un proyecto y a una fase; las fases son carpetas, el proyecto no «avanza» de fase. Hasta 20 MB, en SharePoint (ADR-16) bajo `documentacion/{cliente}/{proyecto}/{fase}/`, con nombres legibles para navegar la biblioteca; un nombre repetido en la misma fase (o en la misma carpeta) se guarda como `nombre (2).ext` y el `FileStore` nunca pisa un archivo. Renombrar un proyecto o una fase no mueve lo ya subido (el enlace es el id del elemento).
- **Lecciones aprendidas:** n por fase, escritas en el editor de Kraken (Tiptap) y guardadas como un `.txt` más de la carpeta de la fase (`doc.documento` con `tipo = LECCION` y título), con el texto en Markdown (UTF-8 con BOM) y el nombre `Lección aprendida - {título}.txt`. Cualquier usuario con rol las edita: editar reemplaza el contenido del mismo archivo (`FileStore.replace`, SharePoint conserva la versión anterior) y se rechaza si otra persona la guardó desde que se abrió (versión = hash). El título no cambia después de crearla. Se quitan como un documento.
- **Permisos:** la información es pública dentro de DIMA. Todo usuario con al menos un rol ve, crea proyectos, edita la cabecera, sube y escribe o edita lecciones aprendidas; quitar un documento es de quien lo subió o del administrador del sistema. Los listados pasan igual por `scopeDocProjectQuery` (regla 7). Crear, editar, subir, editar una lección, quitar y los cambios de fases se auditan.

---

## 3. Arquitectura

Monolito modular en Next.js, en dos nodos detrás de HAProxy, con un worker pg-boss y un clúster PostgreSQL con Patroni. Son 40 usuarios: la redundancia existe para no perder datos ni servicio, no por carga.

```
Usuarios ─HTTPS→ FortiGate/Radware (WAF + TLS) → IP virtual (keepalived)
  → [app-01, app-02]: HAProxy → Next.js x2 · Worker pg-boss x2
      → HAProxy de BD → Primario Postgres ─síncrona→ Réplica · → Réplica   (Patroni + etcd)
         Primario ─WAL continuo→ pgBackRest (ops-01) → NAS + Azure Blob inmutable
  Next.js → Entra ID (OIDC) · SharePoint por Graph (adjuntos)
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
| ADR-06 | Authz centralizada en `src/server/authz`: funciones propias `can*` y `scope*Query(user)`, sin CASL. Una excepción por usuario es un rol asignado a mano, aparte de los de sus grupos de Entra. | Reglas de 2.9 en un solo lugar, testeables. CASL no aportaba sobre funciones simples (YAGNI). |
| ADR-07 | Jobs con pg-boss en un proceso worker separado (`src/worker`, registro en `job-registry.ts`). Su esquema `pgboss` queda fuera de Prisma y en producción se crea con el usuario de migraciones antes del primer arranque. | Sin Redis; los jobs sobreviven a reinicios; sin doble ejecución. |
| ADR-08 | Correo con Microsoft Graph `sendMail` (app-only) desde un buzón de servicio, limitado con RBAC para aplicaciones de Exchange. **Outbox**: la action escribe en `notif.salida` dentro de su transacción y el worker envía con reintentos. | Sin SMTP propio; ningún correo se pierde ni se envía por una transacción revertida. |
| ADR-09 | TC desacoplado: job a las 00:15 + reintentos cada hora → `fx.tipo_cambio`. Cada versión guarda TC de costo, TC de venta y TC oficial. | La API puede fallar; los CV históricos no cambian. |
| ADR-10 | Lógica de dominio pura en `src/domain` (precio, calendario, ponderación, asignación, SLA, costo promedio). | Las reglas delicadas se prueban sin BD. |
| ADR-11 | Versionado de CV por copia (cada versión con sus líneas). Un trigger bloquea cambios en versiones que no estén en `BORRADOR`. | Comparador trivial; lo aprobado no cambia ni por error. |
| ADR-12 | Exportación con ExcelJS sobre la plantilla oficial `PA-PR-03-RE-01` en `templates/`, escribiendo fórmulas. | El formato que DIMA ya usa; archivo "vivo". |
| ADR-13 | Docker Compose sobre VMs de VMware, sin Kubernetes. Dos imágenes sin root (`Dockerfile`): `app` (Next standalone) y `worker` (tsx, solo dependencias de producción; también corre `migrate:deploy`). Plantillas y runbook en `deploy/`. | La misma disponibilidad con mucha menos operación. |
| ADR-14 | Auditoría en `audit.evento` con `recordAudit(tx, …)` explícito dentro de la transacción de cada action que decide algo (crear, enviar, aprobar o rechazar, nueva versión, anular, ajustes y cierres de bolsas, administración y la sincronización con Entra): actor, entidad, acción, antes, después, IP y requestId. Los guardados de borrador no se auditan: la versión enviada es inmutable y es el rastro de sus precios. | Trazabilidad de precios, aprobaciones y ajustes. Explícito y no una extensión de Prisma: la extensión no ve al actor ni la transacción para leer el «antes» (KISS). |
| ADR-15 | Fechas UTC en BD; calendario en `America/La_Paz` (UTC−4, sin horario de verano). | Sin errores de zona horaria. |
| ADR-16 | Adjuntos en una biblioteca de **SharePoint** por Microsoft Graph (app-only, `Sites.Selected` sobre el sitio de Kraken), detrás de la interfaz `FileStore` (`src/server/files`): la BD guarda nombre, hash, tamaño y el id del elemento; la descarga pasa por un route handler con authz. `FILES_ROOT` (carpeta o montaje) queda como alternativa y es el almacén de desarrollo. Hasta 20 MB por archivo. | SharePoint ya es el repositorio documental de DIMA, con versionado y retención de M365; sin NAS ni servicio de objetos adicionales. |

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

PostgreSQL 18 + Prisma. Un esquema por dominio, PK `uuid` v7, `timestamptz` en UTC, borrado lógico solo en catálogos. Tablas y columnas en español `snake_case` vía `@@map`/`@map`; modelos Prisma en inglés.

Prisma 7: `prisma.config.ts` en la raíz (esquema multiarchivo en `prisma/schema/`, URL de migraciones `MIGRATION_DATABASE_URL`); el cliente se genera en `src/generated/prisma` (no versionado) y se usa solo vía `src/server/db.ts` con `@prisma/adapter-pg`. **Toda FK a una persona apunta a `core.usuario_perfil.usuario_id`** (texto, = id de Better Auth), nunca a `auth.user`.

| Esquema | Tablas |
|---|---|
| `auth` | Better Auth: `user`, `session`, `account`, `verification` (no tocar sus columnas) |
| `core` | `area`, `ciudad`, `usuario_perfil`, `rol`, `usuario_rol`, `grupo_entra_rol`, `cliente`, `cliente_contacto`, `proveedor`, `tecnologia`, `unidad`, `tipo_servicio`, `producto`, `horario_oficina`, `horario_franja`, `feriado`, `parametro` |
| `fx` | `tipo_cambio` (fecha de vigencia, compra, venta, fuente, obtenido_en) |
| `cv` | `numerador`, `cv`, `version`, `version_vendedor` (vendedores N–N), `grupo`, `linea`, `linea_serial`, `leasing_linea`, `solicitud_aprobacion`, `adjunto` |
| `horas` | `bolsa`, `bolsa_area`, `movimiento`, `pendiente_sin_bolsa` |
| `tickets` | `proyecto`, `proyecto_area`, `ticket`, `ticket_area`, `ticket_bolsa` (con `prioridad`), `subtarea`, `registro_tiempo`, `evento_contador`, `evento_estado` (historial inmutable de estados), `comentario`, `adjunto`, `sla_politica`, `sla_medicion` |
| `inv` | `almacen`, `stock` (cantidad, reservado y valor: caché de los libros), `unidad_serial`, `movimiento`, `movimiento_linea` (valor y saldo tras la línea), `traspaso`, `traspaso_linea` (valor enviado), `solicitud_ajuste` (el AJUSTE se inserta en el libro solo al aprobarse), `reserva`, `reserva_movimiento` (libro inmutable de lo reservado) |
| `notif` | `salida` (outbox), `bandeja`, `preferencia` |
| `audit` | `evento` |
| `dash` | `meta` (metas mensuales por área o de la empresa); los indicadores se calculan en `src/domain/dashboards` (sección 6) |
| `doc` | `fase` (catálogo con orden), `proyecto` (cabecera), `proyecto_tecnologia`, `documento` (archivo en SharePoint por fase; `tipo` `ARCHIVO` o `LECCION`) |

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
| Autorización | Funciones propias `can*` y `scope*Query` |
| UI | shadcn/ui, Tailwind, lucide-react |
| Grilla del CV | Tabla propia (`features/sales-control/components/lines`) con edición en celda, teclado, pegar desde Excel y lotes; TanStack Table solo si hace falta ordenar o virtualizar |
| Gráficos | Recharts (charts de shadcn) |
| Formularios | react-hook-form + zod |
| Fechas | date-fns + date-fns-tz |
| Decimales | `Prisma.Decimal` |
| Jobs | pg-boss en un proceso `worker` |
| Excel | ExcelJS |
| PDF (comprobante del POS) | pdf-lib (fuentes estándar embebidas; solo genera) |
| Texto enriquecido (lecciones aprendidas) | Tiptap (`@tiptap/react`, `starter-kit`, `markdown`) con una barra propia de botones shadcn; shadcn no trae editor |
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
│  ├─ app/               # (auth), (app)/inicio, cv, tickets, horas, inventario, documentacion, tableros, admin
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
│  │  ├─ authz/          # can*() y scope*Query()
│  │  ├─ db.ts           # cliente Prisma + extensión de auditoría + runInTransaction
│  │  ├─ auth.ts         # configuración de Better Auth
│  │  ├─ auth-policies.ts # quién entra con contraseña, cuenta activa, alta del perfil
│  │  ├─ mail/           # Graph + outbox
│  │  └─ files/          # FileStore (SharePoint por Graph; carpeta local en desarrollo)
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
- **Documentación:** proyectos → cabecera y una carpeta por fase con sus documentos.
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

En v1 no hay vistas `dash.*`: cada indicador es una función pura de `src/domain/dashboards` sobre filas que cargan queries con alcance (`scopeSalesLineQuery` por línea, `scopeEngineerQuery`, `scopeGoalQuery` y los alcances existentes), porque los montos de línea ya tienen su única definición en `src/domain/pricing`. Una vista se crea, y se materializa, solo si una consulta lo exige. La venta del periodo es la versión aprobada vigente fechada en la primera aprobación del CV; con varios vendedores se acredita en partes iguales (decisión 2026-10-22). Las metas son mensuales (`dash.meta`); un trimestre o un año suma sus meses.

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
- Tickets: `createTicket`, `assignOwner`, `setTicketBags`, `createSubtask`, `updateSubtask`, `addComment`, `createProject`, `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, `addManualTimeEntry`, `deleteTimeEntry`, `changeTicketStatus`, `closeTicket`, `reopenTicket`, `setProjectStatus`, `uploadTicketAttachment`, `deleteTicketAttachment`
- Inventario: `registerReceipt`, `dispatchItems`, `returnItems`, `findDispatchTicket`, `createTransfer`, `sendTransfer`, `receiveTransfer`, `cancelTransfer`, `requestAdjustment`, `requestManualAdjustment`, `decideAdjustment`, `submitInventoryCount`; almacenes: `upsertWarehouse`, `setWarehouseActive`
- Administración: CRUD de catálogos (`upsertSimpleCatalogItem` y `setSimpleCatalogItemActive` para áreas, ciudades, tecnologías, unidades, tipos de servicio y proveedores; `upsertCustomer`, `upsertCustomerContact`, `upsertProduct`, `markProductReviewed` y sus bajas), usuarios (`updateUserProfile`, `setUserActive`, `grantUserRole`, `revokeUserRole`), `mapEntraGroup`, `unmapEntraGroup`, `setParameter`, `setManualFxRate`, `sendTestMail`, `retryOutboxMessage`, `upsertSlaPolicy`
- Notificaciones: `markInboxRead`
- Tableros: `upsertGoal` (meta mensual por área o de la empresa; vacía la quita)
- Documentación: `createDocProject`, `updateDocProjectHeader`, `uploadDocument`, `deleteDocument`, `createDocLesson`, `updateDocLesson`; fases: `upsertDocPhase`, `setDocPhaseActive`, `moveDocPhase`

**Route handlers:** `GET /api/cv/[versionId]/export.xlsx` (con authz) · `GET /api/tickets/attachments/[id]` (con authz) · `GET /api/documentation/documents/[id]` (con authz) · `GET /api/inventory/receipts/[id].pdf` (con authz; carpeta `[file]`) · `GET /api/dashboards/[board]/export.xlsx` (ventas, operación o inventario, con los filtros y la authz del tablero) · `GET /api/health/live` · `GET /api/health/ready` (BD y, si los adjuntos van a `FILES_ROOT`, su carpeta; HAProxy saca el nodo si falla) · `/api/auth/*`.

**Jobs:**
| Job | Cuándo | Qué hace |
|---|---|---|
| `fx.fetch-official` | Cada hora a los 15 min (el primero a las 00:15) mientras falte el TC de hoy | API de CUCU → `fx.tipo_cambio`, el vigente y el de mañana si ya se publicó; régimen flexible: compra = venta (implementado) |
| `mail.dispatch` | Cada minuto | Envía `notif.salida` (lotes de 50 con `SKIP LOCKED`) por Graph, o por Mailpit en desarrollo; reintento exponencial con tope de 6 h; tras 10 fallos o uno permanente lo marca fallido y avisa al administrador en la bandeja (implementado; ver `/admin/correo`) |
| `bags.check-thresholds` | Cada 30 min | Consumo proyectado de un ticket abierto mayor al saldo, una vez por ticket y bolsa (implementado; cada 30 min y no «tras cada cierre» para no acoplar la app a pg-boss). Los avisos de 80% y 100% no son job: se emiten en la transacción del movimiento que cruza el umbral (F2) |
| `bags.expire` | 00:05 diario (America/La_Paz) | Vence bolsas, registra `VENCIMIENTO` sin actor, avisa N días antes y el día del vencimiento, una vez cada aviso (implementado) |
| `sla.evaluate` | Cada 5 min | Recalcula el SLA de los tickets abiertos y avisa al 75% (implementado) |
| `timers.stale` | Cada 30 min | Contadores abiertos más de 10 h, un aviso por registro al ingeniero y al encargado (implementado) |
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
- **Traspaso:** `BORRADOR → EN_TRANSITO → RECIBIDO | RECIBIDO_CON_DIFERENCIAS` · `RECIBIDO_CON_DIFERENCIAS → RECIBIDO` (llega lo que faltaba o se da de baja) · `BORRADOR → CANCELADO`.
- **Reserva:** `ACTIVA ⇄ CONSUMIDA` (despacho o devolución, ajuste por versión) · `ACTIVA → LIBERADA` (línea quitada, otro producto o CV anulado); con despachos, liberar recorta a lo despachado (`CONSUMIDA`).
- **Solicitud de ajuste:** `PENDIENTE → APROBADO | RECHAZADO` (rechazar exige comentario).

---

## 9. Principios y reglas de código

### SOLID aplicado
- **S:** una action por archivo; `split-by-business-hours.ts` solo parte intervalos.
- **O:** alertas, KPIs y tipos de job se registran en `*-registry.ts` sin tocar el motor que los ejecuta.
- **L:** `FileStore`, `MailSender` y `FxRateProvider` son intercambiables (misma firma, mismos errores).
- **I:** los componentes reciben tipos de presentación pequeños definidos en `types.ts`.
- **D:** `src/domain` recibe datos y un `Clock`; los servicios inyectan repositorios y proveedores.

### KISS / YAGNI / DRY
- KISS: monolito, pg-boss, Docker Compose, SharePoint para adjuntos.
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
- **Git**: trunk-based, ramas `feat/…` y `fix/…`, Conventional Commits, PRs < 400 líneas netas. Cada rama corre CI al subirla y entra a `main` por fast-forward solo con el CI en verde; nunca force push.
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

### Topología (infraestructura real)
Ubuntu Server 26.04 en todas las VMs, red `172.22.12.0/24`, relojes en UTC. Docker usa `10.250.0.0/24` (docker0) y `10.251.0.0/16` (redes de compose). Dominio `kraken.dima.com.bo`; staging `stg-kraken.dima.com.bo` (solo red interna). Runbook y plantillas en `deploy/` (`deploy/README.md`).

| VM | IP | Contenido |
|---|---|---|
| `lpzvmkrkapp01` | 172.22.12.112 | Docker Compose (`deploy/app/compose.yml`): Next.js, worker, HAProxy (TLS en :443, base por :5000), keepalived en el sistema. Aún no creada |
| `lpzvmkrkapp02` | 172.22.12.113 (reservada) | Igual que app01; después |
| IP virtual | 172.22.12.206 | keepalived entre los nodos de app |
| `lpzvmkrkdb01` | 172.22.12.114 | PostgreSQL 18.6 **nativo** con Patroni 4.1.5 y etcd, clúster `kraken`; API de Patroni en :8008 |
| `lpzvmkrkdb02` | por definir | Réplica del clúster; después. No habrá db03 por ahora |
| `lpzvmkrkops01` | 172.22.12.116 | pgBackRest por SSH con cron, monitoreo propio en `/opt/monitoring` (Prometheus, Alertmanager, Grafana), runner de GitHub |
| `lpzvmkrkstg01` | 172.22.12.117 | Staging en un solo nodo (`deploy/staging/compose.yml`): mismas imágenes, Postgres 18 propio |

- Base `kraken`: `kraken_migrator` es el dueño (DDL; solo lo usa el servicio `migrate`) y `kraken_app` solo DML; `kraken_lectura` es opcional. `btree_gist` y `pg_stat_statements` ya están en `public`.
- Aplicación activo-activo cuando exista app02; HAProxy revisa `/api/health/ready`. Los nombres de los servidores del backend `app` son los de `deploy/hosts/production` (el despliegue los drena por nombre).
- Patroni elige y cambia el primario; la aplicación siempre se conecta por el HAProxy del nodo (`:5000`, chequeo `/primary` en :8008).
- Internet: el FortiGate publica solo el 443 hacia la IP virtual y el HAProxy del nodo termina TLS (`/etc/kraken/tls/kraken.pem`). BD y operaciones no están expuestas. Acceso condicional de Entra con MFA fuera de la red.
- Logs: Alloy está en el perfil `logs` de los compose hasta que Loki tenga destino.

### Respaldos
> **Pendiente de adaptar:** la infraestructura real usa pgBackRest por SSH con cron desde `lpzvmkrkops01`; `deploy/backup/`, `deploy/scripts/restore-test.sh` y la recuperación en Azure (`deploy/azure/dr*`, `deploy/dr/`) se escribieron para TLS, timers de systemd y Postgres 16. Las metas de abajo siguen vigentes.

| Mecanismo | Frecuencia | Destino | Retención |
|---|---|---|---|
| WAL continuo (pgBackRest `archive-async`) | Segundos | NAS + Azure Blob | Toda la ventana de retención (PITR) |
| Completo | Semanal, domingo 02:00 | NAS + Azure | 8 semanas local · 12 meses Azure |
| Diferencial | Diario 02:00 | NAS + Azure | 14 días |
| Adjuntos (SharePoint) | Versionado y retención de M365 | SharePoint | Según la política de retención de DIMA |
| Snapshot de VMware | Antes de cada actualización | Datastore | Se borra tras validar (no es respaldo) |

- Azure Blob con **inmutabilidad por versión** (`deploy/azure/backup.bicep`): pgBackRest reescribe sus índices y su `expire` borra, y cada versión anterior queda protegida 12 meses; credencial de escritura solo en `ops-01`, sin permiso de borrar versiones.
- Respaldos cifrados (clave fuera del NAS). Las claves de cifrado, las SAS y los env de la app se **custodian en un Key Vault** con protección de purga (`deploy/scripts/escrow-secrets.sh`): sin ellos, el respaldo en Azure no se puede usar si se pierde el host.
- **Restauración de prueba mensual** automatizada en `stg-01` desde el NAS y desde Azure, verificando conteos y el último movimiento, y midiendo cuánto tarda.

| Escenario | RPO | RTO |
|---|---|---|
| Cae una VM de app | 0 | Segundos |
| Cae el primario de BD | 0 (réplica síncrona) | < 1 min |
| Corrupción o borrado por error | 0 (PITR) | 1–2 h |
| Cae el host o el NAS | Segundos (último WAL en Azure) | 4 h (levantar en Azure) |

**DR en Azure (en frío):** procedimiento ensayado con Bicep y un script (`deploy/azure/dr.bicep`, `deploy/scripts/dr-restore.sh`; runbook en `deploy/README.md`): crear la VM, traer los secretos del Key Vault, restaurar el repo2 al último WAL, levantar la app de un nodo con las mismas imágenes y cambiar el DNS; el script deja un informe con la duración de cada paso. Se ensaya dos veces al año en modo `ensayo` (sin archivar WAL ni correr el worker, para no tocar producción).

### CI/CD
PR → biome · typecheck · tests de dominio · integración con Postgres · build · E2E (`.github/workflows/ci.yml`) → merge a `main` (rama troncal) → imágenes `app` y `worker` en GHCR etiquetadas con el commit → staging (`pnpm migrate:deploy` + nodo) → aprobación manual del entorno `production` → producción: `haproxy.cfg` validado en todos los nodos y recargado con HUP si cambió → migración compatible hacia atrás → drenar `app-01`, actualizar, verificar → drenar `app-02`, actualizar, verificar (`.github/workflows/deploy.yml` y `deploy/scripts/deploy.sh`). Ganchos locales con lefthook: Biome antes de cada commit; tipos y tests antes de cada push. **Limitación actual:** hasta que exista el runner de `ops-01`, `deploy.yml` solo corre a mano (`workflow_dispatch`); CI corre en cada PR y en cada push a `main`.
- Runner autoalojado en `lpzvmkrkops01` con la etiqueta `ops-01` (sin puertos de entrada). `deploy.sh` entra por SSH a los nombres de `deploy/hosts/<entorno>`; el `~/.ssh/config` del usuario `deploy` en ops01 los resuelve a su IP.
- Entornos: desarrollo (Compose local con Postgres y correo falso), staging y producción.
- Observabilidad: logs JSON con `requestId` (a Loki cuando tenga destino); métricas de HAProxy en `:8404/metrics` para el Prometheus de `/opt/monitoring`.

### Secretos
| Variable | Uso |
|---|---|
| `DATABASE_URL`, `MIGRATION_DATABASE_URL` | Usuario de la app (sin DDL) y usuario de migraciones |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sesiones |
| `TRUSTED_PROXIES` | IP o rangos CIDR de los proxies propios: la IP del FortiGate, las IPs de los nodos de app y los rangos de Docker `10.250.0.0/24` y `10.251.0.0/16` (el HAProxy local llega al contenedor desde la red de Docker). Da la IP real del cliente para el límite de intentos de login (guardado en `auth.rate_limit`, compartido entre nodos) y la auditoría |
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` | Inicio de sesión (permisos delegados). URI de redirección en Entra: `{BETTER_AUTH_URL}/api/auth/callback/microsoft`. Configuración de token: notificación `groups` (grupos de seguridad, token de id, Id. de grupo); cada grupo se mapea a rol + área en `/admin/grupos-entra` y los roles de origen ENTRA se recalculan en cada inicio de sesión (`src/server/entra/sync-entra-roles.ts`) |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | Solo los lee `pnpm db:seed:admin` (contraseña de 12+ caracteres); la app nunca los usa |
| `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `MAIL_SENDER` | Correo (registro de app separado, solo `Mail.Send`, limitado al buzón) |
| `FX_API_URL` | API del tipo de cambio |
| `APP_ENV` | `production` (por defecto, también si falta o tiene otro valor) o `staging`. Las dos imágenes corren con `NODE_ENV=production`; solo con `staging` el correo va a Mailpit (`MAILPIT_URL`) y los adjuntos a `FILES_ROOT` aunque haya Graph o SharePoint configurados, y la interfaz muestra «Entorno de pruebas» (`src/server/app-env.ts`). En producción nada cambia: sin Graph el worker no arranca |
| `MAILPIT_URL` | Desarrollo: Mailpit (por defecto `http://localhost:8025`) cuando Graph no está configurado. Staging: el servicio `mailpit` del compose (`http://mailpit:8025`) |
| `E2E_BASE_URL` | Solo pruebas: servidor bajo prueba de Playwright (por defecto `http://localhost:3100`) |
| `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`, `SHAREPOINT_DRIVE_ID`, `SHAREPOINT_FOLDER` | Adjuntos en SharePoint (registro de app separado con `Sites.Selected`, escritura solo sobre el sitio de Kraken; usa `ENTRA_TENANT_ID`) |
| `FILES_ROOT` | Alternativa a SharePoint: carpeta o montaje de adjuntos; en staging, el volumen `files` del compose (`/var/lib/kraken/files`); en desarrollo, sin nada configurado, `./.files` |

Nunca en el repositorio (`.env.example` documentado). En los servidores: `/etc/kraken/*.env`, fuera del proyecto, con dueño `root:deploy` y permisos 640 (`deploy.sh` corre `docker compose` como `deploy`, que lee los `env_file`); el certificado `/etc/kraken/tls/kraken.pem`, `root` y 600. `deploy.sh` copia a `/opt/kraken/` solo los archivos del compose del entorno y escribe `KRAKEN_TAG` en `/opt/kraken/.env`; nunca toca `/etc/kraken`. Los secretos de Entra se rotan con una alerta 30 días antes de vencer.

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
- VMs, VLANs, Patroni + etcd, HAProxy + keepalived, pgBackRest a NAS y Azure, publicación por FortiGate/Radware [OPUS diseño, SONNET archivos] — plantillas y runbook en `deploy/` (sin validar en VMs: ver `deploy/README.md`)
- Repositorio, tooling (Biome, lefthook, Vitest, Playwright), CI con runner, Compose de desarrollo [SONNET] — hecho; CI en GitHub Actions con `vars.CI_RUNNER`
- Esquemas `auth` y `core`, Better Auth + Entra, grupos → roles, authz con los tests de 2.9 [OPUS] — hecho; sesión de 12 h
- Auditoría, outbox + Graph, job de TC y panel [SONNET] — hecho (`/admin/auditoria`, `/admin/correo`, `/admin/tipo-cambio`)
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
- `allocateTicketHours` (HORAS-01 + propiedades) [OPUS] — hecho (`src/domain/hours/allocate-ticket-hours.ts`)
- Cierre transaccional con bloqueo, test de concurrencia, reapertura con reversos [OPUS] — hecho (`closeTicket`, `reopenTicket`, con sus diálogos en el detalle)
- Tickets, proyectos, subtareas, kanban, detalle, jerarquía arrastrable [SONNET] — hecho (`/tickets`, `/tickets/[id]`, `/tickets/proyectos`; adjuntos en SharePoint con `FileStore`; vista de horas del CV para el ingeniero)
- Contador por eventos, registros manuales, contadores olvidados [SONNET] — hecho
- SLA: políticas, reloj, pausas y alertas [OPUS reloj, SONNET UI] — hecho (`computeSla`, `/admin/sla`, semáforo)
- E2E del recorrido bolsa → ticket → contador → cierre con descuento (`tests/e2e/tickets.spec.ts`) — hecho
- *Sale cuando:* los ingenieros registran todo en tickets y gerencia valida el descuento contra un cálculo manual en al menos 10 tickets reales.

**F4 · Inventario y POS (~3–4 semanas)**
- Esquema `inv`, libro, costo promedio, seriales, reservas [OPUS] — hecho (valor total + promedio derivado; libro de reservas; `lockStocks` en un solo orden)
- Ingresos, salidas, traspasos en dos pasos, ajustes con aprobación, kardex [SONNET] — hecho (`/inventario`, kardex, `/inventario/ingresos/nuevo` con pegar desde Excel, traspasos, ajustes, devoluciones, `/admin/almacenes`)
- POS para tablet con lector y comprobante PDF [SONNET] — hecho (`/inventario/pos`, `/api/inventory/receipts/{id}.pdf`)
- Toma de inventario inicial [operación] — herramientas listas: ingreso de origen «inventario inicial» y conteo físico (`/inventario/conteo`); el inventario real se carga al desplegar en producción
- E2E del recorrido ingreso → traspaso → reserva → POS → comprobante (`tests/e2e/inventory.spec.ts`, proyecto tablet) — hecho
- *Sale cuando:* el stock del sistema coincide con el conteo físico en los tres almacenes.

**F5 · Tableros y KPIs (~2–3 semanas)**
- Taller con gerencia: KPIs, KGIs y metas [negocio] — gerencia dejó la definición al equipo (2026-10-22): v1 con la propuesta de §6, se ajusta con el uso
- Vistas `dash.*` con tests de cálculo [OPUS] — hecho como funciones puras (`src/domain/dashboards`) sobre queries con alcance, sin vistas (§6); `dash.meta` para las metas
- Tableros por rol, filtros, exportación [SONNET] — hecho (`/tableros/ventas`, `/tableros/operacion`, `/tableros/inventario`, `/tableros/metas`, franja «Este mes» en `/inicio`, exportación a Excel; Recharts; datos demo en `db:seed:dev`; E2E `tests/e2e/dashboards.spec.ts`)
- *Sale cuando:* cada gerente usa su tablero en la reunión semanal.

**F6 · Endurecimiento y continuidad (~2 semanas)**
- Revisión de seguridad (authz, cabeceras, sesiones, permisos de Graph y de BD) [OPUS] — hecho (límite de login por IP real detrás de los proxies y guardado en la base, tokens OAuth cifrados y alcances mínimos, CSP y cabeceras, bordes de authz de Administración y adjuntos, `migrate.env` separado, `kraken_lectura` sin `auth`, Patroni con autenticación y réplica síncrona estricta, `pnpm audit` sin avisos altos en runtime salvo los aceptados en `pnpm-workspace.yaml`)
- Ensayo completo de DR en Azure midiendo el RTO real [OPUS + DIMANET] — herramientas listas (`deploy/azure/*.bicep`, `deploy/scripts/dr-restore.sh` con informe de RTO, custodia de secretos en Key Vault, prueba mensual también desde Azure); el ensayo lo ejecuta DIMANET
- Manuales cortos por rol y videos [SONNET] — manuales hechos dentro de la app (`/ayuda`, uno por rol en `src/features/help/manuals`); los videos se graban con los datos demo cuando gerencia valide los manuales
- *Sale cuando:* el sistema se recupera en Azure dentro del RTO y gerencia firma la aceptación.

**F7 · Documentación por proyecto (~1 semana)**
- Esquema `doc`, permisos y catálogo de fases en `/admin/fases-documentacion` [SONNET] — hecho
- Proyectos con su cabecera: listado, alta y edición (`/documentacion`) [SONNET] — hecho
- Documentos por fase en SharePoint: subir, descargar y quitar [SONNET] — hecho (E2E `tests/e2e/documentation.spec.ts`)
- Lecciones aprendidas por fase como `.txt` con editor enriquecido [SONNET] — hecho (botón «Lección aprendida» en cada fase, editor con barra de formato, E2E en `tests/e2e/documentation.spec.ts`)
- Credenciales de SharePoint (registro de app con `Sites.Selected`, permiso de escritura sobre el sitio, id de la biblioteca): guía en `deploy/README.md` («SharePoint para adjuntos y documentación») [DIMANET]
- *Sale cuando:* los proyectos en curso tienen su documentación por fase en Kraken y se ve en la biblioteca de SharePoint.

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
- **F0:** nivel de RAID del NAS. Repositorio: GitHub (`AdheStern/kraken`, rama troncal `main`); confirmar si pasa a una organización de DIMA. Validar en las VMs las plantillas de `deploy/` (Patroni, pgBackRest, keepalived, despliegue nodo por nodo, restauración en staging, DR en Azure). Registro de app de Graph con `Mail.Send` y RBAC de Exchange para el buzón. El BCB pasó al régimen flexible (RD 142/2026: compra = venta = TCO); los TC de costo y de venta del CV siguen siendo manuales (§2.2). Qué roles operativos llevan área (`role-area-rules.ts`: el gerente de área la exige; comercial, preventa, ingeniero y coordinador la admiten). Los roles de Entra se recalculan al iniciar sesión y la sesión dura 12 h sin extenderse: la baja en Entra rige el mismo día.
- **F1:** significado del sufijo `-DS`; confirmar que un rechazo cierra la ronda; valor inicial del umbral del GG; % de desvío del TC que dispara la advertencia.
- **F2:** horario real de cada ciudad (¿con pausa de mediodía?) y feriados departamentales y de traslado: los carga el administrador en `/admin/calendario`. *Confirmado por DIMA (2026-10-14):* multiplicador 2 fuera de horario en 8x5, umbrales de alerta 80% y 100%, aviso de vencimiento a 30 días, y los miembros de un área ven todas sus bolsas. *Resuelto:* las bolsas vigentes se cargan con un "CV de saldo inicial" por cliente (`es_saldo_inicial`, solo horas de servicio con costo y venta 0), aprobado por su gerente.
- **F3:** *Resuelto (2026-10-19):* el redondeo que no cabe en ninguna bolsa se perdona; al reabrir, el consumo en bolsas vencidas o cerradas queda firme; cierran y reabren coordinador, gerente de área y GG. *Resuelto (2026-10-19, tareas 3–5):* crean tickets coordinador, gerente de área y GG; historial inmutable de estados como base del SLA; el paso de redondeo es el parámetro `horas.redondeo_minutos`; adjuntos en SharePoint (ADR-16; faltan las credenciales del registro de app y el id de la biblioteca). *Confirmado por DIMA (2026-10-20):* el redondeo es siempre hacia arriba, los tiempos de SLA de §2.7 y que el tiempo de personas distintas en paralelo se suma.
- **F4:** *Confirmado por DIMA (2026-10-22):* costo promedio ponderado como cantidad + valor total; el inventario real se carga al desplegar. Qué productos exigen serial (se marca en el catálogo) y si se usan almacenes de demostración o repuestos (se crean en `/admin/almacenes`): los define DIMA. *Decidido (2026-10-21):* sobre-reservar con aviso si falta stock; el rol Almacén opera todos los almacenes; las diferencias de traspaso quedan en `TRANSITO` valorizadas por traspaso; carga inicial por ingreso pegado desde Excel más conteo físico (completo o parcial) que ajusta por delta; costos visibles para Almacén, Administración, GG y gerente de área; devolución de una salida al costo de esa salida; el costo del ingreso es obligatorio y admite 0; un código desconocido en un ingreso crea el producto por revisar; PDF con pdf-lib; el ticket muestra sus materiales despachados con el alcance del ticket.
- **F5:** *Decidido (2026-10-22/23):* KPIs y metas a criterio del equipo sobre la propuesta de §6, ajustables con el uso; venta fechada en la primera aprobación del CV con los montos de la versión vigente; varios vendedores en partes iguales; metas mensuales por área o de la empresa, las define el GG (todas) y el gerente de área (las suyas); Inicio conserva su red y suma la franja «Este mes»; gráficos con Recharts. *Abierto:* validar con gerencia el set definitivo de indicadores tras las primeras reuniones semanales.
- **F7:** *Decidido (2026-10-26):* las fases son carpetas del proyecto (no etapas), administrables y sin carga inicial; el proyecto de documentación es una entidad propia (`doc.proyecto`) con cliente, contacto, tecnologías y encargado; la documentación es pública para todo usuario con rol y quitar es de quien subió o del administrador del sistema. *Supuestos a validar:* nombre obligatorio del proyecto sin estado ni correlativo; el administrador del sistema gestiona las fases. *Decidido (2026-10-27):* lecciones aprendidas por fase con editor Tiptap, guardadas como `.txt` con marcado Markdown, editables por cualquier usuario con rol y quitadas por su autor o el administrador del sistema. *Abierto:* nombres de las 4 fases; si más adelante hace falta restringir la visibilidad (cambia solo `scopeDocProjectQuery`).
- **F6:** *Decidido (2026-10-24):* el gerente de área ve los costos de todo el CV si tiene una línea de su área; la infraestructura de DR se escribe en Bicep; los manuales viven dentro de la app. *Abierto (DIMANET):* desplegar `backup.bicep` y custodiar los secretos, primer ensayo de DR con su RTO medido, bloquear la política de inmutabilidad tras el ensayo, TLS y autenticación de etcd.

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
