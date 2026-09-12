const basic = (damage) => ({
  id: 'basic', name: 'QUICK MEETING', kind: 'punch', damage,
  line: 'This meeting has a hard stop. Step back or dodge.', windup: 1.05,
  cooldown: 3.5, recovery: 1.45, range: 3.4,
});
const candy = (damage) => ({
  id: 'candy', name: 'CANDY HADOUKEN', kind: 'candy', damage,
  line: 'A little something from the candy bowl! Sidestep the sweets.',
  windup: 1.25, cooldown: 5, recovery: 1.5, projectileSpeed: 6, radius: 0.36,
});
const numbers = (damage) => ({
  id: 'numbers', name: 'NUMBER CRUNCH', kind: 'number', damage,
  line: 'These numbers do not add up. Keep moving sideways.',
  windup: 1.2, cooldown: 5.5, recovery: 1.4, projectileSpeed: 6.8,
  count: 2, interval: 0.52, radius: 0.36, labels: ['404', '-25%', '110%'],
});
const holes = () => ({
  id: 'holes', name: 'RESOURCE CUT', kind: 'holes', damage: 0,
  line: 'The floor budget has been cut. Leave the striped circles!',
  windup: 1.35, cooldown: 10, recovery: 1.55,
  warning: 1.65, lifetime: 7, radius: 0.9, count: 2, maxHoles: 2,
});
const newsletters = (damage) => ({
  id: 'newsletters', name: 'NEWSLETTER BARRAGE', kind: 'newsletter', damage,
  line: 'DAILY DIGEST! APPS NYTT! Strafe; each issue flies straight.',
  windup: 1.35, cooldown: 6, recovery: 1.5, projectileSpeed: 6.4,
  count: 2, interval: 0.68, radius: 0.42, labels: ['DAILY DIGEST', 'APPS NYTT'],
});

export const BOSSES = [
  {
    id: 'jill_guldhav', slug: 'jill_guldhav',
    name: 'Jill Guldhav', title: 'Office Manager', color: '#b36843',
    bossMusic: 'jill_boss',
    hp: 120, damage: 13, speed: 1.7, windup: 1.25, attackDamageMode: 'absolute',
    intro: 'The candy bowl is complimentary. The performance review is not.',
    hurt: 'That is coming out of the office snack budget!',
    defeat: 'Fine. The office is yours. Refill the candy bowl.',
    promotion: 'Office Manager. You now control the snacks and nobody’s calendar.',
    appearance: { hair: '#d6af60', outfit: '#b36843', accessory: 'candy' },
    attacks: [candy(13), basic(12)],
    phases: [
      { minHp: 0, name: 'Office hours', attacks: ['candy', 'basic'], approachTime: 1.15, speedMultiplier: 1 },
    ],
  },
  {
    id: 'sander_thomassen', slug: 'sander_thomassen',
    name: 'Sander Thomassen', title: 'Department Manager', color: '#697eaa',
    bossMusic: 'sander_boss',
    hp: 180, damage: 16, speed: 1.95, windup: 1.2, attackDamageMode: 'absolute',
    intro: 'Your department is over budget. So is this floor.',
    hurt: 'I am going to need a spreadsheet for that.',
    defeat: 'Those were not the numbers I was forecasting.',
    promotion: 'Department Manager. More resources. Somehow less floor.',
    appearance: { hair: '#654839', outfit: '#697eaa', accessory: 'glasses' },
    attacks: [numbers(16), holes(), basic(15)],
    phases: [
      { minHp: 0.45, name: 'Budget review', attacks: ['numbers', 'holes', 'basic'], approachTime: 1.05, speedMultiplier: 1 },
      { minHp: 0, name: 'Cost reduction', attacks: ['holes', 'numbers', 'basic'], approachTime: 0.9, speedMultiplier: 1.08 },
    ],
  },
  {
    id: 'alf_gilroy', slug: 'alf_gilroy',
    name: 'Alf Gilroy', title: 'Executive Director', color: '#8a6ba3',
    bossMusic: 'alf_boss',
    hp: 240, damage: 18, speed: 2.15, windup: 1.15, attackDamageMode: 'absolute',
    intro: 'Did you read DAILY DIGEST? No? Then APPS NYTT is coming your way.',
    hurt: 'This will be in the next newsletter.',
    defeat: 'You have successfully unsubscribed.',
    promotion: 'Executive Director. Your inbox has been promoted to everyone’s problem.',
    appearance: { hair: '#b8b1a2', outfit: '#8a6ba3', accessory: 'newsletter' },
    attacks: [newsletters(18), numbers(16), { ...holes(), cooldown: 13, count: 1 }, basic(17)],
    phases: [
      { minHp: 0.7, name: 'Daily edition', attacks: ['newsletters', 'basic', 'numbers'], approachTime: 1, speedMultiplier: 1, newsletterCount: 2, newsletterInterval: 0.68 },
      { minHp: 0.4, name: 'Reply all', attacks: ['newsletters', 'holes', 'numbers', 'basic'], approachTime: 0.9, speedMultiplier: 1.05, newsletterCount: 3, newsletterInterval: 0.55 },
      { minHp: 0, name: 'Breaking news', attacks: ['newsletters', 'basic', 'numbers', 'holes'], approachTime: 0.8, speedMultiplier: 1.1, newsletterCount: 4, newsletterInterval: 0.44 },
    ],
  },
  {
    id: 'kjell_rusti', slug: 'kjell_rusti',
    name: 'Kjell Rusti', title: 'CEO', color: '#3d514a',
    bossMusic: 'kjell_boss',
    hp: 320, damage: 21, speed: 2.3, windup: 1.15, attackDamageMode: 'absolute',
    intro: 'I have mastered every management technique. Including punching.',
    hurt: 'CMON!! That was not in the strategy!',
    defeat: 'The company is yours. Please stop replying all.',
    promotion: 'CEO. You reached the top. Now try not to schedule a meeting.',
    appearance: { hair: '#b1aaa0', outfit: '#3d514a', accessory: 'gold-tie' },
    attacks: [
      candy(19), basic(20), numbers(20), { ...holes(), maxHoles: 3, cooldown: 12 },
      newsletters(21),
      {
        id: 'uppercut', name: 'CMON!!', kind: 'uppercut', damage: 45,
        line: 'A hostile upward takeover. Dodge at the end of the wind-up!',
        windup: 1.55, cooldown: 9, recovery: 1.8, duration: 0.38,
        range: 3.6, lungeSpeed: 7.2,
      },
      {
        id: 'aura', name: 'AURA MANIFESTATION', kind: 'aura', damage: 34,
        line: 'Executive presence, weaponized. Give the golden sphere space!',
        windup: 1.65, cooldown: 10, recovery: 1.7,
        projectileSpeed: 4.8, radius: 0.9,
      },
    ],
    phases: [
      { minHp: 0.75, name: 'Office authority', attacks: ['candy', 'basic'], approachTime: 1, speedMultiplier: 1 },
      { minHp: 0.5, name: 'Department authority', attacks: ['numbers', 'holes', 'basic', 'candy'], approachTime: 0.9, speedMultiplier: 1.05 },
      { minHp: 0.25, name: 'Executive authority', attacks: ['newsletters', 'numbers', 'basic', 'holes'], approachTime: 0.8, speedMultiplier: 1.1, newsletterCount: 3, newsletterInterval: 0.52 },
      { minHp: 0, name: 'CEO ENERGY', attacks: ['uppercut', 'aura', 'newsletters', 'basic', 'numbers', 'holes'], approachTime: 0.7, speedMultiplier: 1.15, newsletterCount: 3, newsletterInterval: 0.48 },
    ],
  },
];
