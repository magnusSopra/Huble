import { NPC_SLOTS } from './layout.js';
export { BOSSES } from './bosses.js';
export const TITLES = ['Consultant', 'Office Manager', 'Department Manager', 'Executive Director', 'CEO'];

const task = (id, title, type, description, reward = 25) => ({
  id, title, type, description, reward, energyCost: type === 'coffee' ? 0 : 8,
  ...(type === 'room' ? { destination: 'room', destinationName: 'FJORD meeting room' } : {}),
  ...(type === 'printer' ? { destination: 'printer-working', destinationName: 'a working printer' } : {}),
});

export const FLOORS = [
  {
    name: 'The delivery floor', subtitle: 'Where the actual work happens.',
    accent: '#d5e9a3', threshold: 125,
    tasks: [
      task('restart', 'Have you tried turning it off?', 'repair', 'A computer has developed feelings. Reboot them.'),
      task('coffee', 'A business-critical brew', 'coffee', 'The team runs on Java. The drink, not the language.'),
      task('email', 'Reply all. Regret everything.', 'email', 'Keep the inbox professional. Against all odds.'),
      task('meeting', 'This could have been an email', 'meeting', 'Nod at the right moments while discreetly keeping up with fictional reels.'),
      task('sql', 'SELECT a better life', 'sql', 'Fix a query. No actual SQL knowledge required.'),
      task('jira', 'The blocked blocker', 'jira', 'Move the ticket to Done. A radical new methodology.'),
      task('docs', 'Document the undocumented', 'docs', 'Put the instructions in an order a human could use.'),
      task('cv', 'Your CV has entered fiction', 'cv', 'Four tiny corrections before this reaches a client.'),
      task('hours', 'Please remember to register hours', 'timesheet', 'The work happened. Now prove it in five little boxes.'),
      task('wires', 'Untangle the digital workplace', 'cables', 'Connect matching cables. Not every problem needs a strategy.'),
      task('badge', 'Access denied. Politely.', 'swipe', 'Swipe your employee card at a sensible speed.'),
      task('printer', 'Find a printer that prints', 'printer', 'Three printers. One works. Read the status labels and find it.'),
    ],
  },
  {
    name: 'Middle management', subtitle: 'Less code. More calendar.',
    accent: '#f4c298', threshold: 150,
    tasks: [
      task('deploy', 'A completely safe Friday deploy', 'deploy', 'Follow the release checklist. Breathe occasionally.', 30),
      task('client', 'Just one tiny change', 'client', 'The client wants a complete rewrite. By yesterday.', 30),
      task('password', 'Forgotten. Again.', 'password', 'Help a colleague recover their extremely secure password.'),
      task('room', 'A room of one\'s own', 'room', 'Find FJORD meeting room. It is not the bathroom.', 30),
      task('deadline', 'ASAP means now-ish', 'deadline', 'Clear the incoming requests before they become meetings.', 30),
      task('help', 'Help desk, emotionally', 'help', 'A colleague is blocked. Apply common sense.'),
      task('survive', 'The weekly daily standup', 'survive', 'Divide your attention between the meeting cues and an extremely important pigeon reel.'),
      task('calendar', 'A meeting about scheduling meetings', 'schedule', 'Choose the right people, a free slot and a free room.', 30),
      task('approve', 'The approval of the approval', 'approve', 'Audit a timesheet before approving the impossible.'),
      task('filename', 'Finally final, for real', 'rename', 'Choose a filename a future colleague might understand.'),
      task('upload', 'Uploading the digital transformation', 'upload', 'Keep the connection alive until the files reach the cloud.', 30),
      task('sortmail', 'Inbox triage', 'sortmail', 'Sort actual work from the seven levels of corporate spam.', 30),
    ],
  },
  {
    name: 'Strategy & synergy', subtitle: 'The view improves. The jargon does not.',
    accent: '#b9c6f0', threshold: 180,
    tasks: [
      task('exec-email', 'Re: Re: Re: Vision 2030', 'email', 'Translate executive panic into calm corporate sentences.', 30),
      task('exec-deploy', 'Deploy the digital transformation', 'deploy', 'You are one button away from a company-wide incident.', 30),
      task('exec-sql', 'Find the missing KPI', 'sql', 'The dashboard says we have negative employees.', 30),
      task('exec-meeting', 'Align the alignment', 'survive', 'Nod through shallow ideas while scrolling original, equally shallow reels.', 30),
      task('exec-jira', 'Agile at an executive scale', 'jira', 'Move the company out of the backlog.', 30),
      task('exec-client', 'Stakeholder management', 'client', 'Reassure someone who has just discovered AI.', 30),
      task('exec-coffee', 'Executive espresso', 'coffee', 'The coffee is the same. The cup has a job title.', 30),
      task('desktop', 'Clean desktop, clear conscience', 'desktop', 'File these documents before someone shares their screen.', 30),
      task('sheet', 'One cell is ruining the quarter', 'spreadsheet', 'Find the bad formula. Restore shareholder confidence.', 30),
      task('scope', 'What the client actually meant', 'requirement', 'Read between the buzzwords, not beyond the scope.', 30),
      task('calibrate', 'Calibrate the synergy meter', 'calibrate', 'Stop each moving indicator in the target area.', 30),
      task('shred', 'An entirely normal paper disposal', 'empty', 'Empty the recycling before it becomes an archive.', 30),
    ],
  },
  {
    name: 'The executive floor', subtitle: 'One last approval. One enormous uppercut.',
    accent: '#e5cd83', threshold: 210,
    tasks: [
      task('board-reset', 'Reset the strategic direction', 'reset', 'Repeat the system reset sequence. Try not to reset the company.', 35),
      task('board-cv', 'Executive summary, literally', 'cv', 'Remove the fictional achievements before the board sees them.', 35),
      task('board-hours', 'Account for your entire career', 'timesheet', 'Leadership still has to register hours.', 35),
      task('board-calendar', 'The all-hands scheduling incident', 'schedule', 'Even a CEO cannot be in two rooms at once.', 35),
      task('board-wires', 'Reconnect the leadership team', 'cables', 'The network needs alignment. Actual alignment.', 35),
      task('board-badge', 'Clearance: almost executive', 'swipe', 'Swipe with the measured confidence of middle management.', 35),
      task('board-upload', 'Upload the five-year plan', 'upload', 'Ensure the strategy actually leaves your laptop.', 35),
      task('board-mail', 'Sort the stakeholder inbox', 'sortmail', 'Spam now addresses you as a thought leader.', 35),
      task('board-calibrate', 'Measure the corporate aura', 'calibrate', 'The indicators are vibrating with executive potential.', 35),
      task('board-sheet', 'Balance the bigger spreadsheet', 'spreadsheet', 'Somewhere in here is a number that makes sense.', 35),
      task('board-deploy', 'Deploy the new operating model', 'deploy', 'The final button still says production. It always will.', 35),
      task('board-coffee', 'One last cup before the boardroom', 'coffee', 'Fortify yourself. The final review has an aura.', 35),
    ],
  },
  {
    name: 'The corner office', subtitle: 'Congratulations. Everything is your problem.',
    accent: '#e5cd83', threshold: 0, tasks: [],
  },
];

for (const [index, floor] of FLOORS.slice(0, 4).entries()) {
  const prefix = ['delivery', 'manager', 'strategy', 'board'][index];
  const reward = [25, 30, 30, 35][index];
  floor.tasks.push(
    { ...task(`${prefix}-phone`, 'Researching the meme economy', 'phone', 'Read original fictional memes. Hide your phone when a colleague walks over.', reward), optional: true },
    { ...task(`${prefix}-delegate`, 'A strategic transfer of responsibility', 'delegate', 'Match two jobs to the right expertise, then watch a colleague go do the work.', reward), optional: true },
    { ...task(`${prefix}-ai`, 'Let the algorithm have a go', 'ai', 'Ask a fictional offline AI for a questionable plan. File it for human review.', reward), optional: true },
    { ...task(`${prefix}-dodge-meeting`, 'A meeting you can safely miss', 'dodge-meeting', 'Mark unavailable, choose a believable excuse and politely decline 47 minutes of pre-alignment.', reward), optional: true },
  );
}

const people = [
  ['Magnus', 'Developer', -9, 4, '#738eac'],
  ['Ingrid', 'Senior consultant', -9, -4, '#ba846d'],
  ['Aksel', 'Client lead', -1, 4, '#6c8c72'],
  ['Nora', 'Project manager', 6, -5, '#bba459'],
  ['Eirik', 'Data engineer', -1, -4, '#8880ae'],
  ['Sofie', 'Delivery lead', 8, 4, '#ce8369'],
  ['Liv', 'People & culture', 3, 0, '#91a19b'],
];
const floorPeople = [
  people.map(([name, role]) => [name, role]),
  [
    ['Henrik', 'Release manager'], ['Amalie', 'Account director'], ['Lars', 'IT support'],
    ['Maja', 'Office coordinator'], ['Oskar', 'Scrum master'], ['Thea', 'Team lead'], ['Jonas', 'Agile coach'],
  ],
  [
    ['Astrid', 'Strategy director'], ['Kasper', 'Transformation lead'], ['Sigrid', 'Head of insights'],
    ['Emil', 'Chief alignment officer'], ['Freya', 'Portfolio director'], ['Tobias', 'Partnerships'], ['Ida', 'Executive assistant'],
  ],
  [
    ['Helene', 'Board secretary'], ['Mikkel', 'Talent director'], ['Vilde', 'Finance director'],
    ['Even', 'Chief of staff'], ['Tuva', 'Infrastructure lead'], ['Petter', 'Facilities director'],
    ['Hanna', 'Programme director'], ['Simen', 'Communications'], ['Frida', 'Innovation lead'],
    ['Andreas', 'Financial analyst'], ['Selma', 'Release director'], ['Kristian', 'Executive assistant'],
  ],
];
const extraPeople = [
  ['Emma', 'Career coach'], ['Martin', 'Resource planner'], ['Julie', 'IT operations'],
  ['Sindre', 'Service coordinator'], ['Linnea', 'Office support'],
];
for (let i = 0; i < 3; i++) floorPeople[i].push(...extraPeople);
const floorDialogue = [
  [
    '"It works on my machine." Unfortunately, that machine is on holiday.',
    'Before we circle back, can we circle around the coffee machine?',
    'The client just has one tiny request. I have put it in a 90-page document.',
    'Do you have five minutes? Perfect. I have booked three hours.',
    'The data is fine. Reality is clearly wrong.',
    'We are agile. Except when something needs to change.',
    'The onboarding guide is in the guide to finding the onboarding guide.',
  ],
  [
    'It is Friday. What could possibly go wrong with a production deployment?',
    'They want the same thing, but completely different. A tiny change.',
    'The password hint says "your password". Security has never been tighter.',
    'I booked FJORD. Apparently "somewhere with chairs" was not specific enough.',
    'Everything is the top priority. I have made a priority for our priorities.',
    'My team is blocked by a blocker that is blocking the blocker.',
    'Standup is short today. We are only covering the entire financial year.',
  ],
  [
    'The board has replied all to their own reply all. Please contain the vision.',
    'The digital transformation is ready. It is a button. An expensive button.',
    'Our headcount is minus seven. Finance calls this a productivity improvement.',
    'Today we align our alignment strategy with our strategic alignment.',
    'Can you move the company to Done? The shareholders keep asking.',
    'Our key stakeholder wants AI. Which problem? They will decide afterwards.',
    'An executive espresso is a normal espresso with a steering committee.',
  ],
  [
    'Our strategic direction is frozen. The reset button is marked "innovation".',
    'The board prefers achievements that happened outside your imagination.',
    'Being available all week is not the same as working forty hours.',
    'Find one time when these people are not already discussing that time.',
    'Our wireless vision is very inspiring. Unfortunately, this one needs wires.',
    'The executive reader rejects anyone who seems too eager.',
    'Our cloud strategy is currently saved to Desktop. Please help.',
    'The CEO receives three kinds of email: urgent, very urgent, and lunch.',
    'The aura detector is off the charts. Could you put it back on the charts?',
    'We are one incorrect formula away from exponential nonsense.',
    'A transformation is just a deployment with more stakeholders.',
    'Kjell is waiting. I strongly recommend the coffee.',
  ],
];
for (let i = 0; i < 3; i++) {
  floorDialogue[i].push(
    'A small administrative favour. The word small is doing a lot of work here.',
    'We have streamlined the process. There are now only eleven processes.',
    'The support ticket says "user error". I am the user. Please be discreet.',
    'Our productivity dashboard is waiting for us to be productive.',
    'I have escalated this to the person standing closest to me. That is you.',
  );
}
for (let i = 0; i < 4; i++) {
  floorPeople[i].push(['Ada', 'Culture researcher'], ['Mira', 'Delegation coordinator'], ['Omar', 'Automation enthusiast'], [['Tiril', 'Calendar realist'], ['Birk', 'Focus-time advocate'], ['Hedda', 'Meeting minimalist'], ['Leif', 'Executive gatekeeper']][i]);
  floorDialogue[i].push(
    'This pigeon has a stronger personal brand than our entire department. Please keep an eye out for my manager.',
    'The right person for the job is rarely “whoever answered the message first”. Try matching their expertise.',
    'The assistant is offline, which makes its confidence even more impressive. Please label the result as a draft.',
    'They invited us to 47 minutes of deciding whether we need a meeting. You have a client deadline. Mark unavailable and offer written input — the moon excuse did not work for me.',
  );
}
FLOORS.forEach((floor, index) => {
  floor.npcs = floor.tasks.map((t, i) => ({
    id: `${index}-${i}`, name: floorPeople[index][i][0], role: floorPeople[index][i][1],
    ...NPC_SLOTS[i], color: people[i % people.length][4], task: t,
    dialogue: floorDialogue[index][i],
  }));
});
