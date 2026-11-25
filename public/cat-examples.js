// Example text shown (greyed out) in the box where an organizer describes a voting category, so they can see what a good description looks like.
// Used by the create form (add-contest.html) and the organizer's Details form (organizer.html). A name with no example of its own gets a general one.
const EX = {
  "Best Overall": "The home that wows you most overall.",
  "Most Creative": "Original ideas and handmade touches you have not seen anywhere else.",
  "Best Lights & Music": "Lights that dance in time with the music.",
  "Best Traditional": "Classic warm white lights, wreaths and a timeless holiday look.",
  "People's Choice": "The home neighbors love most.",
  "Twinkle All the Way": "The best use of twinkling or flickering lights.",
  "North Pole Spectacular": "A display that makes you feel you have arrived at the North Pole.",
  "Holiday Magic in Motion": "Moving displays: animated figures, spinning lights, inflatables that come alive.",
  "Best Inflatable": "The best inflatable scene, big or small.",
};
export const exampleFor = (name) => "Example: " + (EX[name] || `What makes a home win "${name}", in a sentence. Voters see this under the category name.`);
