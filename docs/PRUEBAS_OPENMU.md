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
| Chat (enviar/recibir) y comandos de GM | ✅ | `PublicChatMessage`, `ChatMessage`, `ServerMessage` |
| Recoger objeto con clic y con Espacio | ✅ | `ItemsDropped` → `PickupItemRequest` → `ItemDropRemoved`, `ItemAddedToInventory` |
| Usar pociones (Q/W y clic derecho) | ✅ | `ConsumeItemRequest` → `ItemDurabilityChanged`, `CurrentHealthAndShield` (vida 35 → 112) |
| Repartir puntos (panel C) | ✅ | `IncreaseCharacterStatPoint` → `CharacterStatIncreaseResponse` (VIT 25 → 26, vida máx. 112 → 115) |
| Morir y reaparecer | ✅ | `ObjectGotKilled` → `RespawnAfterDeath` (pueblo, vida llena, se puede volver a caminar) |
| Mover/equipar objetos | ✅ | `ItemMoveRequest` → `ItemMoved` (hacha: equipo ↔ inventario, el modelo la suelta/recoge); movimiento inválido → `ItemMoveRequestFailed` |
| Tirar objeto al suelo | ✅ | `DropItemRequest` → `ItemDropResponse`, `ItemsDropped` (el personaje no se mueve con ese clic) |
| Aprender y lanzar habilidades | ✅ | Scroll of Fire Ball → `SkillAdded`; clic derecho → `TargetedSkill` → `SkillAnimation`, `ObjectHit` (22 de daño) |
| Cambiar de mapa | ✅ | Lista (M) Lorencia → Noria: `WarpCommandRequest` → `MapChanged`; portal 25 de Noria → Lorencia: `EnterGateRequest` → `MapChanged` |
| Monstruos/NPCs de otros mapas | ✅ | Noria: Goblin, Scorpion, Elf Lala, Amy, Charon… con su modelo; tras cambiar de mapa se envía `ClientReadyAfterMapChange` |
| Tienda de NPC (Amy, Noria) | ✅ | `TalkToNpcRequest` → `NpcWindowResponse` + `StoreItemList` (32 objetos); comprar → `InventoryMoneyUpdate` (-330 zen); vender → `NpcItemSellResult` (+20 zen) |
| Habilidad de área (Flame) | ✅ | `AreaSkill` → `AreaSkillAnimation`; `AreaSkillHit` con la araña → `ObjectHit` (84 de daño), muere |
| Almacén (Baz) | ✅ | `TalkToNpcRequest` → `NpcWindowResponse` (VaultStorage) + `StoreItemList` (17 objetos); mover poción inventario↔almacén (`ItemMoveRequest` storage 2) → `ItemMoved`; depositar zen → `VaultMoneyUpdate`; cerrar → `VaultClosed` |
| Comercio entre jugadores | ✅ | Dos clientes: `/trade test1Elf` → `TradeRequest` → OK → `TradeRequestAnswer` a ambos; objeto (`ItemMoveRequest` storage 1) → `TradeItemAdded` al otro; zen → `TradeMoneySetResponse`/`TradeMoneyUpdate`; los dos aceptan → `TradeFinished: Success` e inventarios intercambiados. Rechazar y cancelar devuelven el objeto |
| Joyas (Bless/Soul/Life) | ✅ | `ConsumeItemRequest` con `TargetSlot` → `InventoryItemUpgraded` + `ItemRemoved`. Leather Helm +0 → +1 → +2 (Bless); Soul falló (+1) y acertó (+2); Life añadió y luego quitó la opción. Sobre el Horn of Dinorant, Bless/Soul → `ItemConsumptionFailed` |
| Tooltips | ✅ | Requisito de fuerza del Leather Helm +2 = 48, igual que OpenMU (rechazó equiparlo con 29 de fuerza) |
| Subir de nivel | ✅ | `CharacterLevelUpdate` (nivel 2; 440 exp para el 3, igual que OpenMU) |

Detalles observados:

- Los objetos que llegan antes de cargar el terreno quedaban a altura -9999
  (invisibles bajo el mapa); ahora se recolocan al terminar la carga.

- Una vez OpenMU rechazó un destino (`WalkToAsync: ... not an allowed target`) y
  corrigió la posición con `ObjectMoved`. Parece un desajuste entre los tiles
  que el cliente considera transitables y los del servidor.
- Muchos avisos de MobX en modo estricto (se modifica estado fuera de `action`).
- Dos NPC de Lorencia aparecen con la etiqueta "NPC" en lugar de su nombre.
- La definición XML de `TradeButtonStateChanged` tenía el código `C3`; OpenMU
  envía `C1 04 3C <estado>`. Corregido a `3C`. Además OpenMU manda `Checked`
  también cuando el otro suelta el botón, así que el cliente lo alterna.
- `items.json` tenía las columnas desplazadas a partir del nombre (el conversor
  dejaba valores vacíos por los tabuladores de relleno de `Item.txt`), así que
  daño, defensa y requisitos eran incorrectos. Regenerado.
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

Para probar la recogida sin cazar, da rango de GM al personaje (desconectado)
y usa `/item <grupo> <número>` en el chat (Enter), que tira el objeto al suelo:

```sql
update data."Character" set "CharacterStatus"=32 where "Name"='test0Dk';
```

Para probar el comercio, abre dos pestañas con cuentas distintas y pon a los
dos personajes juntos (desconectados); luego escribe `/trade <nombre>` en el chat:

```sql
update data."Character" set "PositionX"=172, "PositionY"=100 where "Name"='test0Dk';
update data."Character" set "PositionX"=174, "PositionY"=100,
  "CurrentMapId"='00000300-0003-0000-0000-000000000000' where "Name"='test1Elf';
```

Cuentas de prueba: `test0`…`test9` (contraseña igual al usuario).
`-reinit` borra y recrea la base de datos: úsalo solo la primera vez.
