import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const marketplaceUrl = process.env.MINECRAFT_MARKETPLACE_URL;

  if (!marketplaceUrl) {
    return NextResponse.json(
      {
        error: "Missing MINECRAFT_MARKETPLACE_URL",
        note: "Minecraft ingestion route is installed, but no marketplace data source URL has been configured yet.",
      },
      { status: 500 }
    );
  }

  const res = await fetch(marketplaceUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 UGC-Intel-Marketplace-Research",
      Accept: "application/json,text/plain,*/*",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        error: "Minecraft marketplace fetch failed",
        status: res.status,
      },
      { status: 500 }
    );
  }

  const payload = await res.json();

  const items =
    payload.items ??
    payload.results ??
    payload.products ??
    payload.entries ??
    payload.data ??
    [];

  let inserted = 0;

  for (const item of items) {
    const marketplaceId =
      item.id ??
      item.productId ??
      item.contentId ??
      item.marketplaceId ??
      item.offerId;

    if (!marketplaceId) continue;

    const { data: itemRow, error: upsertError } = await supabase
      .from("minecraft_marketplace_items")
      .upsert(
        {
          marketplace_id: String(marketplaceId),
          title: item.title ?? item.name ?? item.displayName ?? null,
          creator_name:
            item.creator ??
            item.publisher ??
            item.studio ??
            item.author ??
            null,
          description:
            item.description ??
            item.shortDescription ??
            item.summary ??
            null,
          url: item.url ?? item.productUrl ?? null,
          thumbnail_url:
            item.thumbnailUrl ??
            item.imageUrl ??
            item.thumbnail ??
            item.image ??
            null,
          content_type:
            item.type ??
            item.contentType ??
            item.productType ??
            null,
          category: item.category ?? item.tags?.[0] ?? null,
          price: item.price ?? item.minecoinPrice ?? null,
          currency: item.currency ?? "Minecoins",
          raw_latest: item,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "marketplace_id" }
      )
      .select("id")
      .single();

    if (upsertError) {
      return NextResponse.json(
        {
          error: "Minecraft item upsert failed",
          details: upsertError,
        },
        { status: 500 }
      );
    }

    const { error: snapshotError } = await supabase
      .from("minecraft_marketplace_snapshots")
      .insert({
        item_id: itemRow.id,
        source_name: "minecraft_marketplace",
        rank: item.rank ?? item.position ?? null,
        category: item.category ?? item.tags?.[0] ?? null,
        price: item.price ?? item.minecoinPrice ?? null,
        currency: item.currency ?? "Minecoins",
        rating: item.rating ?? item.averageRating ?? null,
        review_count: item.reviewCount ?? item.reviews ?? null,
        raw_payload: item,
      });

    if (snapshotError) {
      return NextResponse.json(
        {
          error: "Minecraft snapshot insert failed",
          details: snapshotError,
        },
        { status: 500 }
      );
    }

    inserted++;
  }

  return NextResponse.json({
    ok: true,
    platform: "minecraft",
    inserted,
  });
}
