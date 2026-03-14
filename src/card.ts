export type CardFace = {
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  flavorText: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  artCropUrl?: string;
};

export type CardRelation = {
  id?: string;
  name: string;
  component?: string;
  typeLine?: string;
  uri?: string;
};

export type Card = {
  id: string;
  oracleId?: string;
  name: string;
  layout: string;
  manaCost: string;
  manaValue: number;
  typeLine: string;
  oracleText: string;
  colors: string[];
  colorIdentity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  rarity?: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  artCropUrl?: string;
  faces: CardFace[];
  relatedCards: CardRelation[];
  isToken: boolean;
};

type ScryfallImageUris = {
  small?: string;
  normal?: string;
  art_crop?: string;
};

type ScryfallRelatedCard = {
  id?: string;
  name?: string;
  component?: string;
  type_line?: string;
  uri?: string;
};

type ScryfallCardFace = {
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  flavor_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
};

export type ScryfallCard = {
  id: string;
  oracle_id?: string;
  name: string;
  layout?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  legalities?: Record<string, string>;
  rarity?: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  all_parts?: ScryfallRelatedCard[];
  token?: boolean;
};

function mapFace(card: ScryfallCard, face?: ScryfallCardFace): CardFace {
  const imageUris = face?.image_uris ?? card.image_uris;

  return {
    name: face?.name ?? card.name,
    manaCost: face?.mana_cost ?? card.mana_cost ?? "",
    typeLine: face?.type_line ?? card.type_line ?? "",
    oracleText: face?.oracle_text ?? card.oracle_text ?? "",
    flavorText: face?.flavor_text ?? "",
    power: face?.power,
    toughness: face?.toughness,
    loyalty: face?.loyalty,
    defense: face?.defense,
    colors: face?.colors ?? card.colors ?? [],
    imageUrl: imageUris?.normal,
    thumbnailUrl: imageUris?.small ?? imageUris?.normal,
    artCropUrl: imageUris?.art_crop,
  };
}

export function mapScryfallCard(card: ScryfallCard): Card {
  const faces = card.card_faces?.length ? card.card_faces.map((face) => mapFace(card, face)) : [mapFace(card)];
  const primaryFace = faces[0];

  return {
    id: card.id,
    oracleId: card.oracle_id,
    name: card.name,
    layout: card.layout ?? "normal",
    manaCost: card.mana_cost ?? primaryFace.manaCost,
    manaValue: card.cmc ?? 0,
    typeLine: card.type_line ?? primaryFace.typeLine,
    oracleText: card.oracle_text ?? primaryFace.oracleText,
    colors: card.colors ?? primaryFace.colors,
    colorIdentity: card.color_identity ?? [],
    keywords: card.keywords ?? [],
    legalities: card.legalities ?? {},
    rarity: card.rarity,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    imageUrl: primaryFace.imageUrl,
    thumbnailUrl: primaryFace.thumbnailUrl,
    artCropUrl: primaryFace.artCropUrl,
    faces,
    relatedCards: (card.all_parts ?? [])
      .filter((part) => part.name && part.name !== card.name)
      .map((part) => ({
        id: part.id,
        name: part.name ?? "",
        component: part.component,
        typeLine: part.type_line,
        uri: part.uri,
      })),
    isToken: Boolean(card.token),
  };
}
