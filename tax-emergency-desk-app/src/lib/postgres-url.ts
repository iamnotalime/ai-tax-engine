export function normalizePostgresUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema');
  if (schema) url.searchParams.delete('schema');

  return {
    url: url.toString(),
    connection: schema ? { search_path: schema } : {}
  };
}
