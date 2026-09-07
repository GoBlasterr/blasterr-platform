/** Fixtures are opt-in so normal development previews start with real, empty data. */
export function shouldBootstrapSocialFixtures(
  nodeEnv = process.env.NODE_ENV,
  enabled = process.env.ENABLE_SOCIAL_FIXTURES,
): boolean {
  return nodeEnv === "development" && enabled === "true";
}