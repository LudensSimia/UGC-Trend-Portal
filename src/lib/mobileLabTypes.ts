export type MobileLabGame = {
  id: string;
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  genre: string;
  subgenre: string;
  description: string | null;
  upVotes: number | null;
  likeRatio: number | null;
  history: Array<{
    date: string;
    players: number;
    rank: number | null;
    sort: string | null;
  }>;
};

export type MobileLabFortniteIsland = {
  id: string;
  islandCode: string | null;
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  genre: string;
  subgenre: string;
  labels: string[];
  dates: string[];
};

export type MobileLabSeries = {
  key: string;
  label: string;
  color: string;
  points: Array<{ date: string; value: number }>;
};

export type RobloxMobileLabPayload = {
  platform: "roblox";
  games: MobileLabGame[];
  latestDate: string | null;
};

export type FortniteMobileLabPayload = {
  platform: "fortnite";
  islands: MobileLabFortniteIsland[];
  latestDate: string | null;
  labelSeries: MobileLabSeries[];
  genreSeries: MobileLabSeries[];
};

export type MobileLabPayload = RobloxMobileLabPayload | FortniteMobileLabPayload;

export type MobilePublicPayload = {
  generatedAt: string;
  payloadGeneratedAt?: string;
  precomputed?: boolean;
  roblox: RobloxMobileLabPayload;
  fortnite: FortniteMobileLabPayload;
};
