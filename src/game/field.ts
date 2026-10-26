import Phaser from "phaser";
import type { GameState, MissionMap } from "../core/contracts";
import { hashSeed, nextRandom } from "../core/rng";

let sceneInstance: FieldScene | undefined;
let currentState: GameState | undefined;
let currentMap: MissionMap | undefined;

const palette = {
  snow: { base: 0xc7d4d8, accent: 0x546a6d, zone: 0x7b8e72, enemy: 0x963e3e },
  airfield: { base: 0x77866c, accent: 0x4b5650, zone: 0xb9a66a, enemy: 0x933d35 },
  ocean: { base: 0x174963, accent: 0x3c8092, zone: 0x50715b, enemy: 0xa5483e },
  outpost: { base: 0x77654e, accent: 0x465246, zone: 0x9c905e, enemy: 0x9a4439 },
};

class FieldScene extends Phaser.Scene {
  constructor() {
    super("field");
  }

  create(): void {
    sceneInstance = this;
    this.paint();
  }

  paint(): void {
    if (!currentState || !currentMap) return;
    const colors = palette[currentMap.theme];
    const graphics = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;
    const tile = Math.min(width / currentMap.columns, height / currentMap.rows);
    const mapWidth = tile * currentMap.columns;
    const mapHeight = tile * currentMap.rows;
    const originX = (width - mapWidth) / 2;
    const originY = (height - mapHeight) / 2;
    graphics.fillStyle(colors.base, 1);
    graphics.fillRect(0, 0, width, height);

    let rng = hashSeed(`${currentState.seed}:${currentState.currentTurn}:${currentMap.theme}`);
    for (let row = 0; row < currentMap.rows; row += 1) {
      for (let column = 0; column < currentMap.columns; column += 1) {
        const roll = nextRandom(rng);
        rng = roll.state;
        if (roll.value > 0.77) {
          graphics.fillStyle(colors.accent, currentMap.theme === "ocean" ? 0.35 : 0.28);
          graphics.fillRect(originX + column * tile, originY + row * tile, tile - 0.5, tile - 0.5);
        }
      }
    }

    graphics.fillStyle(colors.zone, 0.72);
    graphics.fillRect(originX + mapWidth * 0.13, originY + mapHeight * 0.43, mapWidth * 0.26, mapHeight * 0.21);
    graphics.fillStyle(colors.enemy, 0.42);
    graphics.fillRect(originX + mapWidth * 0.72, originY + mapHeight * 0.25, mapWidth * 0.16, mapHeight * 0.43);
    graphics.lineStyle(1, 0xffffff, 0.16);
    for (let column = 0; column <= currentMap.columns; column += 1) {
      graphics.lineBetween(originX + column * tile, originY, originX + column * tile, originY + mapHeight);
    }
    for (let row = 0; row <= currentMap.rows; row += 1) {
      graphics.lineBetween(originX, originY + row * tile, originX + mapWidth, originY + row * tile);
    }

    const capableRadius = Math.max(10, Math.min(23, 7 + currentState.personnel.capable / 5));
    graphics.fillStyle(0xeff6f3, 1);
    graphics.fillCircle(originX + mapWidth * 0.26, originY + mapHeight * 0.54, capableRadius);
    graphics.fillStyle(0xd86257, 0.85);
    graphics.fillCircle(originX + mapWidth * 0.8, originY + mapHeight * 0.47, Math.max(12, currentState.enemyPressure / 3));

    this.add.text(18, 15, `MAPA OPERACIONAL · TURNO ${currentState.currentTurn}/${currentState.maxTurns}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#f5f5ef",
      fontStyle: "bold",
      shadow: { color: "#000000", offsetX: 1, offsetY: 2, blur: 2, fill: true },
    });
    this.add.text(18, height - 28, "círculo claro: formação · zona vermelha: pressão observada", {
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      color: "#f5f5ef",
      shadow: { color: "#000000", offsetX: 1, offsetY: 1, blur: 2, fill: true },
    });
  }
}

export const mountField = (container: HTMLElement): void => {
  if (container.dataset.mounted) return;
  container.dataset.mounted = "true";
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 840,
    height: 470,
    backgroundColor: "#101820",
    scene: FieldScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: false, pixelArt: true },
  });
};

export const renderField = (state: GameState, map: MissionMap): void => {
  currentState = state;
  currentMap = map;
  if (sceneInstance) {
    sceneInstance.children.removeAll(true);
    sceneInstance.paint();
  }
};
