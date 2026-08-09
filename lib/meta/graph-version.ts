/**
 * Versão da Graph API usada em todas as chamadas. Meta libera uma nova
 * versão major ~2x por ano e expira versões antigas depois de ~2 anos —
 * revise em https://developers.facebook.com/docs/graph-api/changelog
 * periodicamente e atualize esta constante.
 */
export const GRAPH_API_VERSION = "v23.0";
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
