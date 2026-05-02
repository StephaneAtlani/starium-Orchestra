/**
 * Lit le message d’erreur d’une réponse API Nest (JSON `message` ou corps texte).
 */
export async function readApiErrorMessageFromResponse(
  res: Response,
): Promise<string> {
  const text = await res.text().catch(() => '');
  let parsed: { message?: string | string[] } = {};
  try {
    if (text) parsed = JSON.parse(text) as { message?: string | string[] };
  } catch {
    // corps texte brut (ex. Express « Cannot GET … »)
  }
  const msg = Array.isArray(parsed.message)
    ? parsed.message.join(', ')
    : parsed.message;
  if (msg) return msg;
  const plain = text.trim();
  if (plain && plain.length < 500) {
    if (
      res.status === 404 &&
      (plain.includes('Cannot GET') || plain.includes('Cannot POST'))
    ) {
      return `${plain} — Route absente sur l’API en cours : redémarrer le serveur NestJS après mise à jour, ou vérifier INTERNAL_API_URL / le conteneur « api » (Docker).`;
    }
    return plain;
  }
  return res.statusText || 'Erreur';
}
