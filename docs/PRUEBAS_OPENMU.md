# Prueba de compatibilidad con OpenMU

Probado el 2026-09-29 con la imagen Docker `munique/openmu:latest` (Season 6) y
el cliente en Chromium (Playwright), pasando por `bun run proxy`.

## Resultado

| Paso | Estado | Paquetes observados |
| --- | --- | --- |
| Conexión al Connect Server (44405) | ✅ | `Hello`, `ServerListResponse` |
| Lista de servidores y elegir uno | ✅ | `ConnectionInfo` → 127.0.0.1:55901 |
| Conexión al Game Server | ✅ | `GameServerEntered` |
| Login (`test0` / `test0`) | ✅ | `LoginResponse` (Okay) |
| Lista de personajes | ✅ | `CharacterList` (4 personajes) |
| Entrar al mundo (Lorencia) | ✅ | `CharacterInformation`, `CharacterInventory`, `SkillAdded`, `AddNpcsToScope`… |
| Render de personaje, equipo, NPCs y HUD (HP/MP) | ✅ | |
| Caminar | ✅ | `ObjectWalked`; el servidor confirma la posición |
| Monstruos visibles y atacando al jugador | ✅ | `AddNpcsToScope`, `ObjectAnimation`, `ObjectHit` |
| Atacar un monstruo (clic = 1 golpe, mantener = seguir) | ✅ | `HitRequest` → `ObjectHit` (daño 2–9 con Small Axe) |
| Matar monstruo y ganar experiencia | ✅ | `ObjectGotKilled`, `ExperienceGained` |
| Subir de nivel | ✅ | `CharacterLevelUpdate` (nivel 2; 440 exp para el 3, igual que OpenMU) |

Detalles observados:

- Los objetos que llegan antes de cargar el terreno quedaban a altura -9999
  (invisibles bajo el mapa); ahora se recolocan al terminar la carga.

- Una vez OpenMU rechazó un destino (`WalkToAsync: ... not an allowed target`) y
  corrigió la posición con `ObjectMoved`. Parece un desajuste entre los tiles
  que el cliente considera transitables y los del servidor.
- Muchos avisos de MobX en modo estricto (se modifica estado fuera de `action`).
- Dos NPC de Lorencia aparecen con la etiqueta "NPC" en lugar de su nombre.
- Arreglado: en `LoginPage` faltaba `break` tras `Okay`, así que un login
  correcto también ponía un mensaje de error.

## Cómo reproducirlo

```bash
# Postgres local con usuario postgres/admin (lo que espera la imagen)
docker run -d --name openmu --network host munique/openmu:latest \
  -autostart -resolveIP:loopback -reinit -version:season6 -testaccounts

bun install
bun run proxy   # WS :3000 -> TCP
bun run dev     # http://localhost:5173 -> "Play Online"
```

Para probar combate, mueve al personaje fuera del pueblo (con el personaje
desconectado), p. ej. a (190, 130), donde hay arañas y Budge Dragons:

```sql
update data."Character" set "PositionX"=190, "PositionY"=130 where "Name"='test0Dk';
```

Cuentas de prueba: `test0`…`test9` (contraseña igual al usuario).
`-reinit` borra y recrea la base de datos: úsalo solo la primera vez.
