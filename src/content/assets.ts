export type AssetDomain = "personnel" | "vehicles" | "air" | "naval";

export interface ApprovedAsset {
  id: string;
  title: string;
  description: string;
  domain: AssetDomain;
  file: string;
}

/**
 * Canonical stills imported from the approved 27/28 asset catalog in the
 * master Bible. They are presentation art only; never treat them as top-down
 * gameplay sprites or documentary photographs.
 */
export const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;
export const assetUrl = (asset: Pick<ApprovedAsset, "file">): string => `${ASSET_BASE}${asset.file}`;

export const PERSONNEL_ASSETS: ApprovedAsset[] = [
  { id: "P001", title: "Daniel Mercer", description: "Protagonista fictício · 2nd Lieutenant · Companhia Cedar", domain: "personnel", file: "personnel/P001_Daniel_Mercer.png" },
  { id: "P017", title: "General William R. Caldwell", description: "Alto comando ficcional", domain: "personnel", file: "personnel/P017_General_William_R_Caldwell.png" },
  { id: "P018", title: "Dr. Arthur Whitmore", description: "Supervisor médico ficcional", domain: "personnel", file: "personnel/P018_Dr_Arthur_Whitmore.png" },
  { id: "P019", title: "Sargento Isaiah Freeman", description: "Médico de combate ficcional", domain: "personnel", file: "personnel/P019_Sgt_Isaiah_Freeman.png" },
  { id: "P020", title: "General Nathaniel J. Marshall", description: "Comando terrestre ficcional", domain: "personnel", file: "personnel/P020_General_Nathaniel_J_Marshall.png" },
  { id: "P021", title: "Almirante Frederick L. Bennett", description: "Comando naval ficcional", domain: "personnel", file: "personnel/P021_Admiral_Frederick_L_Bennett.png" },
  { id: "P022", title: "General Charles W. Hastings", description: "Comando aéreo ficcional · USAAF", domain: "personnel", file: "personnel/P022_General_Charles_W_Hastings.png" },
  { id: "U001", title: "Infantaria americana", description: "Arquétipo aprovado · 1944", domain: "personnel", file: "personnel/U001_Infantry_American.png" },
  { id: "U002", title: "Paraquedista americano", description: "Arquétipo aprovado · 1944", domain: "personnel", file: "personnel/U002_Paratrooper_American.png" },
  { id: "U003", title: "Piloto da USAAF", description: "Arquétipo aprovado · não é retrato canônico de Walker", domain: "personnel", file: "personnel/U003_USAAF_Pilot.png" },
  { id: "U004", title: "Engenheiro de combate", description: "Arquétipo aprovado · 1944", domain: "personnel", file: "personnel/U004_Combat_Engineer.png" },
  { id: "U005", title: "Operador de rádio", description: "Arquétipo aprovado · 1944", domain: "personnel", file: "personnel/U005_Radio_Operator.png" },
  { id: "U006", title: "Sargento de artilharia", description: "Arquétipo aprovado · 1944", domain: "personnel", file: "personnel/U006_Artillery_Sergeant.png" },
  { id: "U007", title: "Arma de apoio", description: "Arquétipo de metralhador aprovado", domain: "personnel", file: "personnel/U007_Support_Gunner.png" },
  { id: "U008", title: "Marinheiro da US Navy", description: "Arquétipo aprovado · não é retrato canônico de Sullivan", domain: "personnel", file: "personnel/U008_USN_Sailor.png" },
];

const vehicleEntries: Array<[string, string, string]> = [
  ["V001", "M4 Sherman", "V001_M4_Sherman.png"], ["V002", "M24 Chaffee", "V002_M24_Chaffee.png"], ["V003", "M3 Stuart", "V003_M3_Stuart.png"], ["V004", "M8 Greyhound", "V004_M8_Greyhound.png"], ["V005", "M3 Half-track", "V005_M3_Halftrack.png"], ["V006", "Willys MB", "V006_Willys_MB.png"], ["V007", "Artilharia autopropulsada", "V007_Self_Propelled_Artillery.png"], ["V008", "Obuseiro 105 mm", "V008_105mm_Howitzer.png"], ["V009", "Canhão antitanque", "V009_Anti_Tank_Gun.png"], ["V010", "Morteiro de campanha", "V010_Field_Mortar.png"],
];
const aircraftEntries: Array<[string, string, string]> = [
  ["A001", "P-51 Mustang", "A001_P51_Mustang.png"], ["A002", "P-47 Thunderbolt", "A002_P47_Thunderbolt.png"], ["A003", "Spitfire", "A003_Spitfire.png"], ["A004", "Hurricane", "A004_Hurricane.png"], ["A005", "B-17 Flying Fortress", "A005_B17_Flying_Fortress.png"], ["A006", "C-47 Skytrain", "A006_C47_Skytrain.png"], ["A007", "P-38 Lightning", "A007_P38_Lightning.png"], ["A008", "Bf 109", "A008_Bf109.png"], ["A009", "Fw 190", "A009_Fw190.png"], ["A010", "A6M Zero", "A010_A6M_Zero.png"],
];
const navalEntries: Array<[string, string, string]> = [
  ["N001", "Encouraçado aliado", "N001_Allied_Battleship.png"], ["N002", "Encouraçado imperial", "N002_Imperial_Battleship.png"], ["N003", "Encouraçado · conceito B", "N003_Battleship_Concept_B.png"], ["N004", "Porta-aviões de frota", "N004_Fleet_Carrier.png"], ["N005", "Cruzador de guerra · A", "N005_Battlecruiser_A.png"], ["N006", "Cruzador de guerra · B", "N006_Battlecruiser_B.png"], ["N007", "Contratorpedeiro de escolta", "N007_Escort_Destroyer.png"], ["N008", "Submarino oceânico", "N008_Ocean_Submarine.png"], ["N009", "Navio de desembarque", "N009_Landing_Ship.png"], ["N010", "Destróier alternativo", "N010_Destroyer_Alternate.png"],
];

const catalog = (domain: AssetDomain, directory: string, entries: Array<[string, string, string]>): ApprovedAsset[] =>
  entries.map(([id, title, filename]) => ({ id, title, description: "Arte cinematográfica aprovada · catálogo VALE GAMES", domain, file: `${directory}/${filename}` }));

export const VEHICLE_ASSETS = catalog("vehicles", "vehicles", vehicleEntries);
export const AIR_ASSETS = catalog("air", "air", aircraftEntries);
export const NAVAL_ASSETS = catalog("naval", "naval", navalEntries);
export const APPROVED_ASSETS = [...PERSONNEL_ASSETS, ...VEHICLE_ASSETS, ...AIR_ASSETS, ...NAVAL_ASSETS];

export const approvedAsset = (id: string): ApprovedAsset => {
  const asset = APPROVED_ASSETS.find((entry) => entry.id === id);
  if (!asset) throw new Error(`Missing approved asset: ${id}`);
  return asset;
};
