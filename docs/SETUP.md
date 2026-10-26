# Setup del entorno

Todos usamos las mismas versiones:

- Node **26.12.1**
- npm **11.20.0** (viene con Node)
- Angular **22**

El proyecto tiene `engine-strict=true`, así que si usás otra versión de Node `npm ci` no va a instalar nada.

## Pasos

1. Instalar nvm ([Windows](https://github.com/coreybutler/nvm-windows/releases) / [Mac-Linux](https://github.com/nvm-sh/nvm)).
Sino, instalar version a nivel global sin descargar nvm

2. Instalar y usar Node 26.12.1:

   ```bash
   nvm install 26.12.1
   nvm use 26.12.1
   ```

3. Clonar e instalar dependencias:

   ```bash
   git clone <url-del-repo>
   cd turnos-app-frontend
   npm ci
   ```

4. Levantar el proyecto:

   ```bash
   npm start
   ```

## A tener en cuenta

- Usar `npm ci`, no `npm install` (salvo para agregar una librería nueva).
- Siempre subir el `package-lock.json`.
- No hace falta instalar Angular CLI global, usen `npx ng ...`.
- Si aparece `EBADENGINE`: `nvm use 26.12.1` y de nuevo `npm ci`.
