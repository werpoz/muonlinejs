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
| Party | ✅ | Dos clientes: `/party test1Elf` → `PartyRequest` → rechazar (sin party) / aceptar (`PartyInviteResponse`) → `PartyList` a ambos; `PartyHealthUpdate` (test1Elf con 20 de vida → 3/10); el líder expulsa y el miembro sale → `RemovePartyMember` y la party de 2 se disuelve |
| Máquina del Caos | ✅ | Chaos Goblin → `NpcWindowResponse: ChaosMachine`; objetos con `ItemMoveRequest` (storage 3); `ChaosMachineMixRequest` de 3 bytes (OpenMU busca la receta) → poción sola: `IncorrectMixItems`; Jewel of Creation + Jewel of Chaos: `Success`, `StoreItemList` con la fruta y -3.000.000 zen. No deja cerrar con objetos dentro |
| Susurros y amigos | ✅ | Dos clientes: `/w test1Elf …` → B recibe `ChatMessage` tipo 2 (llega con código 0x02); `/r` responde. Añadir amigo → `FriendRequest` → aceptar (`FriendAddResponse`) → `FriendAdded` + `FriendOnlineStateUpdate` (en línea); borrar → `FriendDeleted` |
| Guild | ✅ | Guild Master (Devias, nivel 100) → `ShowGuildMasterDialog` → `GuildMasterAnswer` → `GuildCreateRequest` (nombre + emblema) → `GuildCreationResult`, `AssignCharacterToGuild`, `GuildInformation`. Con dos clientes: `/guild test0Dk` → `GuildJoinRequest` → aceptar → `GuildJoinResponse: Accepted`, `GuildList` con los dos; `[Testers]` sobre ambos; `@hola guild` llega a los dos; expulsar y disolver → `GuildKickResponse` |
| Minimapa | ✅ | Tab en Noria y Lorencia: mapa generado del terreno, NPC, portales y jugador |
| Sonido | ✅ | Lorencia (190,130), 25 s atacando: `Music/main_theme`, `eSwingWeapon1/2`, `eMeleeHit1-4`, `mBudge1`/`mBudgeAttack1`/`mBudgeDie`, `pMaleScream`, `pWalk(Grass)`, `pDrink` (Q), `iButtonClick`; el volumen de música de Opciones se aplica (0,2) y se guarda |
| Efectos de habilidades | ✅ | 18 habilidades lanzadas en Lorencia con captura a mitad de animación: todas visibles |
| PvP | ✅ | Dos clientes en Lorencia (175,125): A ataca a B → "Self defense is initiated…", `ObjectHit` en B y animación de ataque de A (acción 120); B muere al golpe 23 → `HeroStateChanged: 4` (aviso de PK) y B ve el nombre de A en naranja |
| Panel C | ✅ | DK nivel 100 (FUE 60, AGI 20, VIT 500): daño 11 ~ 21 con hacha, tasa de ataque 545, defensa 19 (tasa 26), velocidad 21, vida 1735; fórmulas de `Persistence/Initialization/CharacterClasses` |
| Tienda personal | ✅ | Dos clientes en Lorencia (177,125): S → mover joyas del inventario a la tienda (`ItemMoveRequest`, storage 4, casilla 214) → clic derecho y precio (`PlayerShopSetItemPriceResponse: Success`) → abrir (`PlayerShopOpenSuccessful`, `PlayerShops`); B ve el cartel "Cheap stuff", lo abre (`PlayerShopItemList`) y compra (`PlayerShopBuyResult: Success`, −1.000 zen); A recibe `PlayerShopItemSoldToPlayer` y B la lista actualizada (llega con acción 0x13 en el byte del sub código); cerrar → `PlayerShopClosed` y el cartel desaparece. Si falta un precio OpenMU no responde: el cliente avisa a los 2 s |
| Muerte de monstruos | ✅ | Budge Dragon en Lorencia (190,130): `ObjectGotKilled` → acción 6 una vez, se desvanece desde 1,6 s y se borra a los 2,6 s aunque `MapObjectOutOfScope` llegue antes |
| NPC sin ventana | ✅ | Leo → `ObjectMessage` en el diálogo; Elf Soldier → `OpenNpcDialog` (F9 01) → "Receive blessing" (`NpcBuffRequest` F6 31) → `MagicEffectStatus` efecto 3; Sevina y Priest Devin → mensaje de misión; Julia, Gens, Charon, Lahap, Mensajero del Arcángel, Cherry Blossom → aviso de que falta la ventana. Tras cualquiera de ellos, un mercader (Lumen, Elf Lala) abre su tienda: antes OpenMU dejaba el diálogo abierto y no respondía a otros NPC |
| Misiones y cambio de clase | ✅ | DK nivel 150 con Sevina (Devias): `LegacyQuestStateDialog` (A1, misión 0 inactiva) → Accept → `LegacyQuestStateSetRequest` (A2, Active) → −1.000.000 zen; Scroll of Emperor (`/item 14 23`) → Hand in → `LegacyQuestReward` +10 puntos y A2 Complete. Misión 1 con Broken Sword → `CharacterEvolutionFirstToSecond` (48 >> 3 = 6): **Blade Knight** en el panel C, 23 puntos. Sevina a un Blade Knight: "I have no quests for you." |
| Marlon | ⚠️ | OpenMU recibe `TalkToNpcRequest` para Marlon (C3 05 30 03 3A) y no contesta nada, ni en modo depuración, también con su aparición automática: problema del servidor. El cliente trata sus misiones (2 y 3) igual que las de Sevina |
| Iconos de buffs | ✅ | test1Elf recibe la bendición del Elf Soldier → `MagicEffectStatus` efecto 3 → icono 3 de newui_statusicon arriba con su nombre al pasar el ratón. Los efectos sin icono (28, marca de GM) no se muestran |
| Aura de buffs | ✅ | test1Elf con la bendición del Elf Soldier (efecto 3): chispas blancas y doradas (Shiny02) suben alrededor del cuerpo; centradas en la caja del modelo (se dibuja en el centro de la casilla, +0,5). Los efectos de los demás jugadores llegan en `AddCharactersToScope` y `MagicEffectStatus` |
| Lahap | ✅ | Devias (194,16): 10 × Jewel of Bless (`/item 14 13`) → Lahap (`NpcWindowResponse: Lahap`, el diálogo queda abierto) → x10 (`LahapJewelMixRequest` Mix, Bless, Ten) → "Packed Jewel of Bless x10", −500.000 zen → Unpack (Unmix, slot) → 10 joyas, −1.000.000 zen |
| Blood Castle | ✅ | test1Elf nivel 60 en Devias, horario de prueba cada 5 min: `/item 13 18 1` → Mensajero del Arcángel → ventana con BC 1-8 y "The entrance is open!" (`MiniGameOpeningState`) → Enter (`BloodCastleEnterRequest`) → OpenMU no envía el resultado si funciona: `MapChanged` al mapa 11 → `UpdateMiniGameState: BloodCastleClosed` (30 s antes de empezar), `ChangeTerrainAttributes` (quita Blocked en la entrada y el puente), `BloodCastleState` cada segundo: 19:40, monstruos 0/40, "Defeat the monsters to open the bridge". La puntuación final (`BloodCastleScore`) no se ha visto en vivo |
| Devil Square | ✅ | Charon (Noria): `/item 14 19 1` → "The entrance opens in 5 minutes"… → Enter (`DevilSquareEnterRequest`, nivel 0-based) → mapa 9 → `DevilSquareClosed` → marcador 20:30 (cuenta atrás de 30 s + 20 min, OpenMU no envía el inicio) y aparecen los monstruos. La tabla (`MiniGameScoreTable`) no se ha visto en vivo: OpenMU no aplicó una duración de prueba más corta |
| Mapas de Blood Castle 2-8 / Devil Square 5-7 | ✅ | `TerrainData` de OpenMU idéntico en los mapas 11-17 y 52 (md5 3a3bb311…) y en 9 y 32: el cliente carga World12 / World10 para todos (`src/common/worldFolder.ts`). Mapas 13, 52 y 32 cargados y dibujados |
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
- `PartyInviteResponse` estaba definido con longitud 4, pero tiene 6 bytes
  (`RequesterId` en el índice 4); OpenMU lo define con 6. Corregido.
- Los susurros recibidos llegan como `ChatMessage` con el código 0x02 (el tipo
  es el propio código), que el dispatcher no conocía: se descartaban.
- Los paquetes de 3 bytes (p. ej. `ShowGuildMasterDialog`) hacían fallar el
  dispatcher al leer el subcódigo y bloqueaban la cola. Corregido.
- `GuildInfoRequest` estaba definido con 6 bytes; su `GuildId` (entero en el
  índice 4) necesita 8, como en OpenMU. Corregido.
- Tras cambiar de mapa el servidor vuelve a enviar al propio jugador en
  `AddCharactersToScope` y el cliente lo duplicaba. Ahora reutiliza la entidad.
- En Devias, (213,47) no es una casilla válida: el servidor recoloca al
  personaje. Para probar el Guild Master usa (208,47).
- Para dejar a un personaje sin estado de PK tras probar el PvP:
  `update data."Character" set "State"=0, "PlayerKillCount"=0, "StateRemainingSeconds"=0 where "Name"='test0Dk';`
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
