# Arquitectura del cliente

Cliente web de MU Online compatible con el servidor [OpenMU](https://github.com/MUnique/OpenMU).

```
Navegador (Babylon.js + ECS)
        │  WebSocket (binario)
        ▼
proxy/main.ts (Bun)  ── convierte WS ⇄ TCP
        │  TCP
        ▼
OpenMU: Connect Server (44405) → Game Server (55901+)
```

## Módulos

| Ruta | Responsabilidad |
| --- | --- |
| `proxy/` | Puente WebSocket ⇄ TCP (los navegadores no abren sockets TCP). |
| `src/common/encryption/` | SimpleModulus, Xor32 y Xor3 (cifrado del protocolo MU). |
| `src/common/packets/` | Definiciones y serialización de paquetes (`npm run generate`). |
| `src/common/BMD`, `terrain`, `objects` | Lectura de modelos/mapas originales (convertidos con `tools/`). |
| `src/ecs/` | Entidades y sistemas (red, movimiento, animación, render, input). |
| `src/ecs/systems/networkSystem.ts` | Recibe paquetes del servidor y actualiza el mundo. |
| `src/ui/` | Interfaz React (inventario, barra inferior, preloader). |
| `tools/` | Conversión de assets: BMD→GLB, OZJ→JPEG, OZT→TGA. |

## Flujo de conexión

1. El cliente abre WS al proxy → TCP al **Connect Server**.
2. Pide la lista de servidores y elige un Game Server.
3. Reconecta al **Game Server** (paquetes cifrados con SimpleModulus + Xor32).
4. Login → lista de personajes → entrar al mapa.
5. Intercambio de paquetes de movimiento, inventario, combate, etc.

## Puesta en marcha con OpenMU

1. Levantar OpenMU (ver su [QuickStart](https://github.com/MUnique/OpenMU/blob/master/QuickStart.md)), por ejemplo con Docker.
2. `bun install && bun run proxy`
3. `bun run dev` y abrir <http://localhost:5173/>.

Variables del proxy: `PORT`, `HOSTNAME`.

## Añadir un paquete nuevo

1. Definirlo en `src/common/packets/packetsDefinitions/`.
2. Ejecutar `bun run generate`.
3. Manejarlo en `networkSystem.ts` (recepción) o enviarlo desde la lógica del juego.
