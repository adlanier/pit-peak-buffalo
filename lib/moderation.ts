function normalizeForModeration(input: string): string {
  return input
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '')
}

function getBlockedWords(): string[] {
  const raw = process.env.BLOCKED_WORDS ?? ''
  return raw
    .split(',')
    .map(w => w.trim().toLowerCase())
    .filter(Boolean)
    .map(normalizeForModeration)
}

export function containsBlockedWord(text: string): boolean {
  const normalizedText = normalizeForModeration(text)
  const blockedWords = getBlockedWords()

  return blockedWords.some(word =>
    normalizedText.includes(word)
  )
}
