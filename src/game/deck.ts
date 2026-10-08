import type { AgendaCard, AgendaKind } from './types'

const FLAVOR: Record<AgendaKind, string[]> = {
  keynote: [
    'Build vs. Buy in the AI Era — front row seats.',
    'Jason has entered the ballroom.',
    'You scanned in early. Power move.',
  ],
  hallwayTrack: [
    'You found the secret corridor behind Room D.',
    'Badge printer jam? Take the long way.',
    'Following the smell of coffee between sessions.',
  ],
  openSpaces: [
    'Open Spaces: grab whatever you need from the table.',
    'Sponsor booth haul — no judgment.',
    'The swag table was restocked. Lucky you.',
  ],
  networking: [
    'Networking Reception: everyone owes you a favor.',
    'You collected LinkedIn QR codes like Pokémon.',
    'Someone said "we should sync" and meant it.',
  ],
  lightningTalk: [
    'Your AI Agent Just Ran DELETE Without WHERE.',
    'Probably Secure: vibes-based cryptography.',
    'LEGO + IoT + Azure = fun!',
    'Three Lessons from a Woman in Enterprise Architecture.',
    'Floors, Not Ceilings: AI enablement confessionals.',
  ],
}

function pickFlavor(kind: AgendaKind, i: number): string {
  const list = FLAVOR[kind]
  return list[i % list.length]
}

export function createAgendaDeck(rng = Math.random): AgendaCard[] {
  const cards: AgendaCard[] = []
  let n = 0
  const add = (kind: AgendaKind, title: string, count: number) => {
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `${kind}-${n++}`,
        kind,
        title,
        flavor: pickFlavor(kind, i),
      })
    }
  }

  add('keynote', 'Keynote Pass', 14)
  add('hallwayTrack', 'Hallway Track', 2)
  add('openSpaces', 'Open Spaces', 2)
  add('networking', 'Networking Reception', 2)
  add('lightningTalk', 'Lightning Talk', 5)

  // Fisher-Yates
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}
