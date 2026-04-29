export function requireEnv(env: NodeJS.ProcessEnv, key: string, providerLabel: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(
      `${key} est manquante. Définis cette variable d'environnement pour utiliser le provider ${providerLabel}.`
    );
  }

  return value;
}
