export function computeFatigueScore(answers) {
  const questions = [
    { id: 'Q1', weight: 2.5, inverted: false },
    { id: 'Q2', weight: 2.0, inverted: false },
    { id: 'Q3', weight: 1.5, inverted: false },
    { id: 'Q4', weight: 1.5, inverted: false },
    { id: 'Q5', weight: 2.0, inverted: true  },
    { id: 'Q6', weight: 1.5, inverted: true  },
    { id: 'Q7', weight: 1.5, inverted: false },
  ]
  const MIN_POSSIBLE = 12.5
  const MAX_POSSIBLE = 65.0

  let weightedSum = 0
  for (const q of questions) {
    let val = answers[q.id]
    if (q.inverted) val = 6 - val
    weightedSum += val * q.weight
  }

  const borgScore = 6 + ((weightedSum - MIN_POSSIBLE) / (MAX_POSSIBLE - MIN_POSSIBLE)) * 14

  let level, label
  if      (borgScore <= 8)  { level = 0; label = "None" }
  else if (borgScore <= 11) { level = 1; label = "Mild" }
  else if (borgScore <= 14) { level = 2; label = "Moderate" }
  else                      { level = 3; label = "Severe" }

  return {
    rawScore:  Math.round(weightedSum * 10) / 10,
    borgScore: Math.round(borgScore * 10) / 10,
    level,
    label
  }
}
