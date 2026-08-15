import {rankCatalogCandidates} from "@/lib/catalog-ranker";
import {buildCatalogResult, loadVerifiedCatalog, selectCatalogCandidates} from "@/lib/netflix-catalog";
import type {RecommendationRequest} from "@/lib/recommendation-contracts";

export async function getCatalogRecommendations(request: RecommendationRequest, now = new Date()) {
  const entries = loadVerifiedCatalog();
  const {eligible} = selectCatalogCandidates(request, entries, now);
  const ranking = await rankCatalogCandidates(request, eligible);
  return buildCatalogResult(request, entries, ranking.ids, ranking.model, now);
}
