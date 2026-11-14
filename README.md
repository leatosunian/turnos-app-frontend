# TurnosApp

Plataforma web de turnos online para negocios que trabajan con agenda: peluquerías, barberías, centros de estética, consultorios, gimnasios y similares. Cada negocio se registra, arma sus servicios, su equipo y sus horarios, y comparte un link público donde sus clientes reservan y pagan la seña sin tener que escribirle a nadie.

Este repositorio es el **frontend**, hecho en Angular. El backend es una API REST en Spring Boot que está en un repositorio aparte (ver [Backend](#backend)).

Trabajo práctico de **Programación 4**, UTN, 4.º cuatrimestre, **Grupo 8**.

| Integrante       | Rol en el equipo           |
| ---------------- | -------------------------- |
| Leandro Tosunian | Product Owner y desarrollo |
| Nicolás Irianni  | Desarrollo                 |
| Nicolás Rojas    | Desarrollo                 |

---

## Índice

1. [El problema que resuelve](#el-problema-que-resuelve)
2. [Roles](#roles)
3. [Funcionalidades](#funcionalidades)
4. [Cómo funciona una reserva](#cómo-funciona-una-reserva)
5. [Tecnologías](#tecnologías)
6. [Arquitectura del frontend](#arquitectura-del-frontend)
7. [Rutas](#rutas)
8. [Backend](#backend)
9. [Diseño](#diseño)
10. [Cómo levantar el proyecto](#cómo-levantar-el-proyecto)
11. [Tests](#tests)
12. [Forma de trabajo](#forma-de-trabajo)
13. [Pendiente a futuro](#pendiente-a-futuro)

---

## El problema que resuelve

Muchos negocios chicos siguen dando turnos por WhatsApp o por teléfono. Eso trae tres problemas:

- El dueño pierde tiempo contestando mensajes para coordinar día y horario.
- Hay superposiciones y turnos anotados en papel que se pierden.
- Los clientes que no se presentan dejan huecos en la agenda que nadie paga.

TurnosApp centraliza todo en una sola agenda. El negocio publica los horarios disponibles, el cliente elige y reserva solo, y para asegurar el turno paga una **seña** (un porcentaje del precio del servicio). Si cancela con tiempo se le devuelve; si no se presenta, el negocio se la queda.

---

## Roles

El sistema tiene cuatro roles. Un mismo usuario puede tener más de uno (por ejemplo, un dueño que también atiende).

| Rol                       | Quién es                                | Qué puede hacer                                                                                       |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Visitante**             | Cualquier persona sin cuenta            | Ver la landing, entrar al perfil público de un negocio y reservar un turno dejando su nombre y email. |
| **Cliente** (CLIENT)      | Alguien que reserva turnos              | Lo mismo que el visitante, más ver sus turnos próximos y pasados y cancelarlos.                       |
| **Dueño** (OWNER)         | El que administra un negocio            | Todo el panel: agenda, turnos, servicios, equipo, horarios, datos del negocio y estadísticas.         |
| **Empleado** (EMPLOYEE)   | Un profesional del equipo de un negocio | Ver los turnos que tiene asignados y sus propios números (turnos atendidos, horas, ingresos).         |
| **Administrador** (ADMIN) | El equipo de la plataforma              | Ver métricas generales, gestionar usuarios, negocios y rubros.                                        |

Cada rol entra a su propia pantalla al iniciar sesión y solo ve en el menú lo que puede usar. Las rutas están protegidas con guards: si alguien escribe a mano una dirección que no le corresponde, se lo redirige a la suya.

---

## Funcionalidades

### Sitio público

- **Landing** (`/`): presentación de la plataforma, cómo funciona, funciones principales y rubros. Tiene un botón para ver un negocio de ejemplo.
- **Ingresar / Crear cuenta** (`/ingresar`): una sola pantalla con dos pestañas. Al crear la cuenta se elige si es para un negocio (dueño) o para reservar turnos (cliente). Los formularios validan con las mismas reglas que el backend, así los errores aparecen antes de mandar.
- **Perfil público del negocio** (`/:slug`, por ejemplo `/barberia-prueba-ta12`): datos del negocio, rubros, servicios con precio y duración, y la reserva en tres pasos:
  1. Elegir el servicio.
  2. Elegir día en un calendario mensual y horario entre los turnos libres.
  3. Completar los datos de contacto (si hay sesión iniciada se usan los de la cuenta).
- **Pago de la seña** (`/reserva/:id`): muestra el detalle de la reserva y un contador con el tiempo que queda para pagar. Si no se paga a tiempo, el turno se libera solo. Si el servicio no pide seña, la reserva queda confirmada directamente.
- **Página de no encontrado**: para cualquier ruta que no existe o un negocio con un link equivocado.

### Cliente

- **Mis turnos** (`/mis-turnos`): turnos próximos y pasados, con el estado de cada uno y el de su seña. Se pueden cancelar los turnos reservados o pendientes de pago. Si se cancela con 24 horas o más de anticipación la seña se devuelve; con menos, la pierde.

### Panel del dueño

- **Hoy** (`/panel`): el día de trabajo de un vistazo. Resumen con la ocupación del día, las señas cobradas y los turnos que quedan libres, la lista de turnos de hoy con el que está en curso marcado, y un detalle de cada turno con los datos del cliente. Desde ahí se puede suspender un turno o copiar el link de pago para mandárselo al cliente.
- **Agenda** (`/panel/agenda`): vista semanal con una pestaña por día y una fila por cada intervalo del horario de atención. Cada turno se pinta según su estado, con leyenda abajo. Se puede navegar entre semanas, volver a hoy y filtrar por profesional. Tocando una fila libre se **crea un turno** a mano (libre o ya a nombre de un cliente que llamó por teléfono). Tocando un turno se ve su detalle.
- **Turnos** (`/panel/turnos`): todos los turnos en una lista paginada, con filtros por estado (libres, esperando seña, reservados, cancelados, suspendidos) y la cantidad de cada uno. Desde el menú de cada fila se **suspende** un turno (la seña se le devuelve al cliente) o se **elimina** uno libre.
- **Servicios y equipo** (`/panel/servicios`): alta, edición y baja de servicios (nombre, duración, precio y porcentaje de seña) y de profesionales del equipo. Al dar de alta un profesional se le crea su cuenta de empleado; al editarlo, la contraseña es opcional.
- **Estadísticas** (`/panel/estadisticas`): turnos, ocupación, cancelaciones, ingresos y señas por período (hoy, semana, mes, año o un rango de fechas a elección). Desglose por servicio, por profesional y días de más trabajo.
- **Mi negocio** (`/panel/negocio`): nombre, link público (slug), email y teléfono de contacto, descripción y rubros (hasta un tope), con una vista previa de cómo lo ve el cliente. Si el negocio todavía no existe, desde acá se crea.
- **Horarios y plantillas** (`/panel/horarios`): para cada día de la semana se define si abre, desde qué hora hasta qué hora y cada cuánto se parte la grilla. Sobre esa grilla se arma la **plantilla semanal**: qué servicio se ofrece en cada horario y con qué profesional. Se puede asignar en lote. La **agenda automática** publica los turnos de la plantilla para los próximos días y los va extendiendo sola.

En el celular el panel tiene una barra inferior con las pantallas principales, un menú "Más" con el resto (y el link público del negocio para copiar) y un botón flotante para crear un turno.

### Panel del empleado

- **Mis turnos** (`/panel/mis-turnos`): los turnos que tiene asignados, agrupados por día, con horario, cliente, servicio, teléfono o email y estado. Se puede ver lo próximo o lo anterior y filtrar por estado. Es de solo lectura: los cambios los hace el dueño.
- **Mi actividad** (`/panel/actividad`): sus números del período (turnos atendidos, horas trabajadas, ingresos que generó) y el desglose por servicio, con comparación contra el período anterior.

### Administración

- **Resumen** (`/admin`): cantidad de negocios, negocios activos, usuarios, usuarios nuevos, turnos e ingresos de toda la plataforma. Ranking de negocios con más turnos y gráfico de usuarios nuevos de los últimos meses.
- **Usuarios** (`/admin/usuarios`): búsqueda por nombre o email, filtro por rol, cambio de roles y activar o desactivar cuentas.
- **Negocios** (`/admin/negocios`): búsqueda por nombre, slug o dueño, filtro por rubro y baja de negocios.
- **Rubros** (`/admin/rubros`): alta, edición y baja de los rubros que los negocios eligen para describirse, con la cantidad de negocios que usa cada uno.

---

## Cómo funciona una reserva

Cada turno pasa por estos estados:

| Estado en el back | Cómo se muestra                  | Qué significa                                                                                                              |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| UNBOOKED          | Libre                            | El horario está publicado y nadie lo tomó.                                                                                 |
| AWAITING_PAYMENT  | Esperando seña                   | Alguien lo reservó y tiene 30 minutos para pagar la seña. Si no paga, vuelve a quedar libre.                               |
| BOOKED            | Confirmado, En curso o Terminado | La seña está paga (o el servicio no la pide). El front lo divide según la hora: antes de empezar, mientras dura y después. |
| CANCELLED         | Cancelado                        | Lo canceló el cliente.                                                                                                     |
| SUSPENDED         | Suspendido                       | Lo suspendió el negocio. La seña siempre se devuelve.                                                                      |

Flujo normal:

1. El dueño arma horarios y plantillas, y la agenda automática publica turnos **libres**.
2. El cliente entra al link del negocio, elige servicio, día y horario, y reserva. El turno pasa a **esperando seña**.
3. El cliente paga la seña y el turno queda **confirmado**.
4. El día del turno, el dueño lo ve en Hoy y en la Agenda; el profesional asignado lo ve en Mis turnos.

Reglas de la seña:

- Si el cliente cancela con **24 horas o más** de anticipación, se le devuelve.
- Si cancela con **menos de 24 horas**, la pierde y queda para el negocio.
- Si el negocio suspende el turno, se le devuelve siempre.

En los colores, siempre va un punto más el texto del estado, nunca solo el color, para que se entienda también sin distinguir colores.

---

## Tecnologías

| Herramienta    | Versión           | Para qué se usa                                                                                          |
| -------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| Angular        | 22.2              | Framework del frontend. Componentes standalone, signals y control flow nuevo (`@if`, `@for`, `@switch`). |
| TypeScript     | 6.0               | Lenguaje.                                                                                                |
| RxJS           | 7.8               | Pedidos HTTP y flujos asincrónicos.                                                                      |
| Tailwind CSS   | 4.1               | Estilos, con los colores y medidas del diseño definidos como tokens en `@theme`.                         |
| Vitest + jsdom | 5                 | Tests unitarios y de componentes.                                                                        |
| Prettier       | 3.8               | Formato del código (100 columnas, comillas simples).                                                     |
| Node / npm     | 26.12.1 / 11.20.0 | Entorno. La versión está fijada con `engine-strict`.                                                     |

No se usan librerías de componentes: todos los componentes de la interfaz están hechos por el equipo.

---

## Arquitectura del frontend

```
src/app/
├── core/            lo que se usa en toda la app y no tiene interfaz
│   ├── guards/        rolGuard (rutas por rol) e invitadoGuard (/ingresar solo sin sesión)
│   ├── interceptors/  tokenInterceptor (agrega el JWT) y errorInterceptor (errores y sesión vencida)
│   ├── models/        interfaces de lo que manda y recibe la API, un archivo por modelo
│   └── services/      un servicio por recurso del backend (turnos, negocios, servicios, etc.)
├── layouts/
│   ├── public-layout/   header y footer del sitio público
│   └── private-layout/  sidebar, barra inferior y menú "Más" del panel y de admin
├── pages/
│   ├── public/   landing, ingresar, perfil del negocio, pago de seña, mis turnos, 404
│   ├── panel/    pantallas del dueño y del empleado
│   ├── admin/    pantallas del administrador
│   └── dev/      catálogo de componentes (solo existe en desarrollo)
└── shared/
    ├── components/  botón, campo, diálogo, confirmación, chip de estado, slot, interruptor,
    │                segmentado, pastilla y aviso de vacío
    ├── directives/  animación de aparición
    ├── pipes/       fecha, hora, monto y duración en formato argentino
    └── validadores/ reglas de nombre y email compartidas por todos los formularios
```

Decisiones principales:

- **Componentes standalone y lazy loading.** Cada pantalla se carga recién cuando se entra a su ruta (`loadComponent`), así la primera carga es más liviana.
- **Signals para el estado.** Cada pantalla guarda su estado en `signal` y deriva lo demás con `computed`. Los pedidos HTTP siguen siendo Observables y se cancelan solos al salir de la pantalla con `takeUntilDestroyed`.
- **Sesión con JWT.** El token se guarda en `localStorage`. Al abrir la app se pide `/auth/me` para recuperar el usuario y sus roles antes de que corran los guards. Si el back responde 401, la sesión se cierra y se manda a ingresar.
- **Errores uniformes.** El `errorInterceptor` convierte cualquier error HTTP en un mensaje que se puede mostrar al usuario (sin conexión, error del servidor o el mensaje que manda el back).
- **Responsive.** Todas las pantallas tienen versión de escritorio y de celular. En el panel cambia la navegación: sidebar en escritorio, barra inferior y menú "Más" en el celular.
- **Formato argentino.** Fechas, horas y montos se muestran con el locale `es-AR` mediante pipes propios.
- **Loader inicial.** Mientras baja Angular se ve un loader hecho en HTML plano dentro de `index.html`, así la pantalla nunca queda en blanco.

---

## Rutas

| Ruta                  | Pantalla                     | Acceso             |
| --------------------- | ---------------------------- | ------------------ |
| `/`                   | Landing                      | Público            |
| `/ingresar`           | Ingresar y crear cuenta      | Solo sin sesión    |
| `/:slug`              | Perfil del negocio y reserva | Público            |
| `/reserva/:id`        | Pago de la seña              | Público            |
| `/mis-turnos`         | Mis turnos del cliente       | CLIENT             |
| `/panel`              | Hoy                          | OWNER              |
| `/panel/agenda`       | Agenda semanal               | OWNER              |
| `/panel/turnos`       | Lista de turnos              | OWNER              |
| `/panel/servicios`    | Servicios y equipo           | OWNER              |
| `/panel/estadisticas` | Estadísticas                 | OWNER              |
| `/panel/negocio`      | Mi negocio                   | OWNER              |
| `/panel/horarios`     | Horarios y plantillas        | OWNER              |
| `/panel/mis-turnos`   | Mis turnos del empleado      | EMPLOYEE           |
| `/panel/actividad`    | Mi actividad                 | EMPLOYEE           |
| `/admin`              | Resumen                      | ADMIN              |
| `/admin/usuarios`     | Usuarios                     | ADMIN              |
| `/admin/negocios`     | Negocios                     | ADMIN              |
| `/admin/rubros`       | Rubros                       | ADMIN              |
| `/componentes`        | Catálogo de componentes      | Solo en desarrollo |

Las rutas de `/panel` y `/admin` se declaran antes que el sitio público porque `/:slug` coincide con cualquier dirección.

---

## Backend

Repositorio: [github.com/nicorojass/turnos-app](https://github.com/nicorojass/turnos-app)

API REST en **Java 21 + Spring Boot 4**, con Spring Security y JWT, JPA y **MySQL 8**. Corre en `http://localhost:8080` y todos los endpoints están bajo `/api/v1`. Tiene documentación con Swagger en `/swagger-ui.html`.

Endpoints principales que usa el frontend:

| Recurso               | Endpoints                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Autenticación         | `POST /auth/login`, `POST /auth/register` (dueño), `POST /auth/register/client`, `GET /auth/me`                            |
| Negocios              | `GET /businesses/mine`, `POST /businesses`, `PUT /businesses/{id}`, `GET /businesses/slug/{slug}` (público)                |
| Servicios             | `GET /businesses/{id}/services` (público), alta, edición y baja para el dueño                                              |
| Equipo                | `GET` y `POST /businesses/{id}/employees`, `PUT` y `DELETE /employees/{id}`                                                |
| Horarios              | `GET` y `PUT /businesses/{id}/schedule`, plantillas en `/businesses/{id}/appointment-schedules` y `POST .../generate`      |
| Turnos del negocio    | `GET /businesses/{id}/appointments` (paginado y filtrable), `GET .../today`, `POST /businesses/{id}/appointments`          |
| Reserva               | `GET /businesses/{id}/appointments/public` (libres), `POST /appointments/{id}/book`, `POST /appointments/{id}/pay-deposit` |
| Acciones sobre turnos | `PUT /appointments/{id}/cancel`, `PUT /appointments/{id}/suspend`, `DELETE /appointments/{id}`                             |
| Turnos propios        | `GET /users/me/appointments` (cliente), `GET /employees/me/appointments` (empleado)                                        |
| Estadísticas          | `GET /businesses/{id}/stats`, `GET /businesses/{id}/stats/employees/{id}`                                                  |
| Administración        | `/admin/users`, `/admin/stats`, `GET` y `DELETE /businesses`, CRUD de `/business-types`                                    |

La dirección de la API se configura en `src/environments/environment.ts` (`apiUrl`). El backend solo acepta pedidos desde `http://localhost:4200` (CORS), así que el front tiene que correr en ese puerto.

---

## Diseño

La interfaz sigue una dirección visual propia, **"Nocturno sobrio"**: un tema oscuro pensado para usarse muchas horas seguidas en el mostrador de un negocio.

- **Colores.** Fondos grafito en escalones (cada nivel un poco más claro que el anterior, sin sombras ni degradés). Ámbar como color principal y para marcar "ahora". Menta para lo pagado y confirmado, coral para lo pendiente y los errores, celeste para lo informativo, lo suspendido y el modo administrador.
- **Tipografía.** Onest para toda la interfaz e IBM Plex Mono solo para horas, montos, porcentajes y links, así los números quedan alineados.
- **Bordes.** Radios anidados (18, 14 y 10 px) y chips redondeados.
- **Textos.** Voseo rioplatense formal ("Elegí el servicio", "Revisá tu conexión"). Las fechas se escriben en palabras ("Martes 28 de octubre").
- **Accesibilidad.** Estados con punto más texto, foco visible, etiquetas para lectores de pantalla, anuncios con `aria-live` en los cambios importantes y navegación con teclado en diálogos y menús.

Todos los colores, fuentes y medidas están definidos como tokens de Tailwind en `src/styles.css`, así cada componente usa los mismos valores.

---

## Cómo levantar el proyecto

### Requisitos

- Node **26.12.1** y npm **11.20.0**. Hay un `.nvmrc`, así que con nvm alcanza con `nvm use`. La guía completa está en [docs/SETUP.md](docs/SETUP.md).
- El backend corriendo en `http://localhost:8080` con su base MySQL (ver el README del repositorio del backend).

### Pasos

1. Clonar el repositorio e instalar las dependencias:

   ```bash
   git clone https://github.com/leatosunian/turnos-app-frontend.git
   cd turnos-app-frontend
   npm ci
   ```

2. Levantar el servidor de desarrollo:

   ```bash
   npm start
   ```

3. Abrir `http://localhost:4200`.

### Otros comandos

| Comando                    | Qué hace                                       |
| -------------------------- | ---------------------------------------------- |
| `npm start`                | Servidor de desarrollo con recarga automática. |
| `npm run build`            | Build de producción en `dist/`.                |
| `npm test`                 | Corre todos los tests.                         |
| `npx prettier --write src` | Formatea el código.                            |

### Cuentas de prueba

Estas cuentas existen en la base local del equipo. En otra base hay que crearlas desde la pantalla de registro o desde Servicios y equipo.

| Rol      | Email                  | Contraseña  | Qué tiene cargado                                                                   |
| -------- | ---------------------- | ----------- | ----------------------------------------------------------------------------------- |
| Dueño    | dueno.ta12@prueba.test | Prueba1927x | Barbería Prueba (`/barberia-prueba-ta12`) con servicios, equipo, horarios y turnos. |
| Empleada | lucia@prueba.test      | Prueba1927x | Turnos asignados próximos y anteriores en todos los estados.                        |
| Empleado | tomas@prueba.test      | Prueba1927x | Turnos asignados de la misma barbería.                                              |
| Dueña    | malbec@prueba.test     | Malbec2026x | Estudio Malbec (`/estudio-malbec`), el negocio de ejemplo de la landing.            |

El usuario administrador lo crea el backend al arrancar, con el email y la contraseña que se configuran en su `application.properties`.

---

## Tests

El proyecto tiene **más de 440 tests** repartidos en 69 archivos `.spec.ts`, que corren con Vitest sobre jsdom:

```bash
npm test
```

Qué se prueba:

- **Servicios:** que cada método pegue al endpoint correcto con los parámetros correctos (con `HttpTestingController`).
- **Guards e interceptors:** redirecciones por rol, sesión vencida y armado de los mensajes de error.
- **Pipes y validadores:** formatos de fecha, hora, monto y duración, y las reglas de nombre y email.
- **Componentes y pantallas:** que se muestre lo que corresponde según los datos, los estados de carga, vacío y error, los filtros, la paginación y las acciones (reservar, cancelar, suspender, eliminar, etc.).
- **Funciones puras:** cálculos de la agenda (semanas, días, filas de horarios), agrupado de turnos por día y estados de un turno según la hora.

Las fechas se fijan con relojes falsos en los tests que dependen del día, así no fallan según cuándo se corran.

---

## Forma de trabajo

- **Scrum con Jira.** Backlog en Jira (espacio TA), con historias por pantalla, puntos de historia y dos sprints de una semana. Cada historia tiene criterios de aceptación.
- **Diseño primero.** Antes de programar se armó una maqueta completa de todas las pantallas, en escritorio y celular, y una guía visual con los tokens y componentes.
- **Git Flow simplificado.**
  - Ramas `main` (entregas), `develop` (integración) y una rama por historia: `feature/TA-XX-descripcion` o `fix/...`.
  - Commits chicos en español que empiezan con la clave del ticket, por ejemplo `TA-25 agrega el filtro por estado`.
  - Pull request a `develop` con una aprobación como mínimo, y merge con **squash**, así cada historia queda como un solo commit en `develop`.
  - Al cerrar un sprint se hace un PR de `develop` a `main` con su tag.
- **Dueños de archivos compartidos.** Para evitar conflictos, archivos como las rutas, los estilos globales y la configuración tienen un responsable.

---

## Pendiente a futuro

Lo que el backend todavía no soporta aparece en la interfaz deshabilitado y marcado como **Futuro**, así se ve hacia dónde va el producto:

- Pago real de la seña con Mercado Pago (hoy el pago es simulado).
- Buscador de negocios en el header del sitio público.
- Restablecer la contraseña desde Ingresar.
- Búsqueda de turnos por cliente o email y filtro por rango de fechas en la lista de Turnos.
- Asignarle un cliente a un turno libre desde el panel Hoy.
- Pausar un servicio sin borrarlo.
- Que el dueño dé de baja su propio negocio (hoy solo lo puede hacer un administrador).
- Borrado definitivo de usuarios desde administración (hoy se desactivan).
- Botón "Cómo llegar" en los turnos del cliente.
