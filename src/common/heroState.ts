// HeroState of the players (PK status), the color of the name shows it
export enum HeroState {
  New = 0,
  Hero = 1,
  LightHero = 2,
  Normal = 3,
  PlayerKillWarning = 4,
  PlayerKiller1stStage = 5,
  PlayerKiller2ndStage = 6,
}

export const HERO_STATE_PK_WARNING = HeroState.PlayerKillWarning;

// class of the name label
export function heroStateClass(state: number | undefined): string {
  switch (state) {
    case HeroState.Hero:
    case HeroState.LightHero:
      return 'hero';
    case HeroState.PlayerKillWarning:
      return 'pk-warning';
    case HeroState.PlayerKiller1stStage:
    case HeroState.PlayerKiller2ndStage:
      return 'pk';
    default:
      return '';
  }
}
