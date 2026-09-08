export function sentimentPercentages(positive: number, negative: number) {
  const safePositive = Math.max(0, positive);
  const safeNegative = Math.max(0, negative);
  const total = safePositive + safeNegative;
  if (total === 0) return { positivePercentage: 0, negativePercentage: 0 };

  const positivePercentage = Math.round((safePositive / total) * 100);
  return {
    positivePercentage,
    negativePercentage: 100 - positivePercentage,
  };
}