function evaluate(predictions) {
  const cases = Array.isArray(predictions) ? predictions : []

  let tp = 0
  let tn = 0
  let fp = 0
  let fn = 0

  let latencyTotal = 0

  for (const item of cases) {
    const expected = Boolean(item.expected)
    const actual = Boolean(item.actual)

    if (item.latencyMs != null) {
      latencyTotal += Number(item.latencyMs) || 0
    }

    if (expected && actual) tp++
    else if (!expected && !actual) tn++
    else if (!expected && actual) fp++
    else if (expected && !actual) fn++
  }

  const total = cases.length

  const accuracy = total
    ? (tp + tn) / total
    : 0

  const precision =
    tp + fp
      ? tp / (tp + fp)
      : 0

  const recall =
    tp + fn
      ? tp / (tp + fn)
      : 0

  const f1 =
    precision + recall
      ? (2 * precision * recall) / (precision + recall)
      : 0

  const averageLatencyMs = total
    ? latencyTotal / total
    : 0

  return {
    totalCases: total,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    averageLatencyMs: Number(averageLatencyMs.toFixed(2)),
  }
}

module.exports = {
  evaluate,
}
