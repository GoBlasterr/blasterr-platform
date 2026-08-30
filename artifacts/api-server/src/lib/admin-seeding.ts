export function shouldSeedDevelopmentState(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === "development";
}