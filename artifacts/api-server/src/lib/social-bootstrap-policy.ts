/** Keep fixture writes out of production and test processes. */
export function shouldBootstrapSocialFixtures(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === "development";
}