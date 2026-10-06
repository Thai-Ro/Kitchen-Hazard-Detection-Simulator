export type Zone = {
  id: string;
  name: string;
  short: string;
  position: [number, number];
  hazards: Hazard[];
};

export type Hazard = {
  id: string;
  name: string;
  description: string;
  clue: string;
  correct: string;
  unsafe: string;
  lesson: string;
  visual: string;
  riskExplanation: string;
};

const h = (
  id: string, name: string, description: string, clue: string,
  correct: string, unsafe: string, lesson: string, visual: string, riskExplanation: string,
): Hazard => ({ id, name, description, clue, correct, unsafe, lesson, visual, riskExplanation });

export const zones: Zone[] = [
  {
    id: 'cooking', name: 'Cooking', short: '01', position: [-4.5, 5.4], hazards: [
      h('pot-handle', 'Pot handle sticking out', 'A pan handle projects beyond the range edge into the aisle.', 'A hot handle is extending into the path where someone could catch it.', 'Turn the handle inward, away from the aisle, and keep it over the range.', 'Leave it there but remind the team to walk carefully.', 'Handles turned inward are less likely to be bumped, spilling hot contents onto someone.', 'handle', 'A passerby can catch the handle and spill hot contents into the aisle, causing burns.'),
      h('hot-oil', 'Hot oil', 'A pan of hot oil is unattended on an active burner.', 'A pan is heating with no one attending it.', 'Turn off the burner and stay with the pan until the oil is safely cooled.', 'Pour water into the pan to cool it quickly.', 'Water can flash to steam and violently scatter burning oil. Never use water on a grease fire.', 'oil', 'Water can vaporize instantly in hot oil and force burning oil out of the pan.'),
    ],
  },
  {
    id: 'sink', name: 'Sink', short: '02', position: [0, 6], hazards: [
      h('running-water', 'Running water', 'The sink tap is running unattended and the basin is close to overflowing.', 'Water is being left to run with nobody at the basin.', 'Turn off the tap and check the basin and surrounding floor.', 'Leave it running; the drain should eventually catch up.', 'Overflow can spread water into walkways and create a slip hazard.', 'tap', 'The basin may overflow before the drain catches up, sending water onto the floor.'),
      h('cleaning-chemicals', 'Cleaning chemicals', 'An unlabeled cleaning bottle sits beside the food-prep sink.', 'A chemical container has no readable product identification.', 'Set it aside from food and label it according to its product information.', 'Pour it into a food container and write “cleaner” on the lid.', 'Unmarked or food-like containers can lead to accidental ingestion or mixing.', 'bottle', 'A food-style container can be mistaken for something edible, even with a hand-written lid note.'),
      h('wet-floor-sink', 'Wet floor', 'A patch of standing water is spreading from beneath the sink.', 'A reflective puddle sits in a busy standing area.', 'Block the wet patch, dry it promptly, and address the source.', 'Step around it and wait for the next scheduled floor clean.', 'Promptly isolating and drying a spill prevents slips and secondary injuries.', 'puddle', 'Someone else may not see the spill and can slip before the next scheduled clean.'),
    ],
  },
  {
    id: 'prep', name: 'Food Preparation', short: '03', position: [4.5, 5.4], hazards: [
      h('knife-edge', 'Knife near the edge', 'A chef’s knife is balanced close to the counter edge.', 'A sharp tool is positioned where it could be knocked down.', 'Move the knife to a stable cutting area, flat and away from the edge.', 'Catch it by the handle if it starts to fall.', 'Never try to catch a falling knife. Secure tools before they become a falling hazard.', 'knife', 'Trying to catch a falling knife puts hands in the path of the blade.'),
      h('open-food', 'Open food container', 'Prepared food is uncovered on the work surface.', 'Ready-to-eat food is sitting open near active work.', 'Cover the food and store it appropriately between tasks.', 'Move it farther back on the same uncovered counter.', 'A cover protects food from splashes, debris and other contamination.', 'food', 'Moving it back does not protect exposed food from splashes or other contamination.'),
      h('plastic-wrap', 'Plastic wrap roll near edge', 'A wrap roll is about to slide off the worktop.', 'A long loose roll is balanced at the counter edge.', 'Move the roll back to a stable storage spot on the counter.', 'Pull the loose end so it hangs off the edge for easy reach.', 'Loose items near an edge can fall, distract workers, or create a snag hazard.', 'roll', 'The hanging roll can pull the whole object off the counter or catch on someone passing.'),
    ],
  },
  {
    id: 'storage', name: 'Storage', short: '04', position: [-5, 0], hazards: [
      h('heavy-box', 'Heavy box on top shelf', 'A dense supply box is stored above shoulder height.', 'The heaviest load is on the highest shelf.', 'Move the heavy box to a low, stable shelf that is easy to reach.', 'Stand on a nearby crate to reach it without stretching.', 'Heavy high loads are difficult to control and can fall; crates are not safe steps.', 'box', 'A crate can tip underfoot, and lifting the box overhead still risks a dropped load.'),
      h('unstable-items', 'Unstable stored items', 'Several pans and containers are stacked unevenly.', 'The stack leans over the edge of a storage shelf.', 'Restack stable, heavy items low and keep the pile within the shelf.', 'Add one more item on top to balance the stack.', 'Unstable stacks can shift and fall onto someone reaching nearby.', 'stack', 'Adding weight to a leaning stack can make it shift or topple onto someone.'),
      h('open-ladder', 'Ladder left open', 'A step ladder is open in the aisle with nobody using it.', 'An open piece of equipment is obstructing the route.', 'Close it and return it to its designated storage place.', 'Leave it as a warning marker for the aisle.', 'Closing and storing equipment keeps walkways clear and prevents collisions.', 'ladder', 'An open ladder remains a collision and obstruction hazard even if treated as a warning.'),
    ],
  },
  {
    id: 'refrigerator', name: 'Refrigerator', short: '05', position: [0, -2.8], hazards: [
      h('fridge-door', 'Open refrigerator door', 'The refrigerator door is standing open into the aisle.', 'A large cold-room door is left wide open.', 'Close the door and check that it seals properly.', 'Prop it open so the next person can grab supplies faster.', 'An open door obstructs traffic and makes it harder to maintain safe cold storage.', 'door', 'The door continues to block the aisle and the cold unit may not hold its intended temperature.'),
      h('fallen-food', 'Fallen food', 'Food has fallen onto the floor in front of the refrigerator.', 'Food is down on the floor in a working route.', 'Keep people clear, discard contaminated food, and clean the area.', 'Pick it up and put it back on the shelf if it looks clean.', 'Food on the floor is contaminated and must not return to storage or service.', 'fallen', 'Visible cleanliness cannot rule out contamination from the floor; returning it can expose others.'),
      h('fridge-water', 'Water on the floor', 'A small puddle has formed at the refrigerator threshold.', 'A slick patch is collecting where people step in and out.', 'Mark the area, dry it, and report or correct the leak.', 'Put cardboard over it and continue working.', 'Covering a wet patch can hide the slip hazard without removing its cause.', 'puddle', 'Cardboard can become slippery or conceal the water while the leak continues beneath it.'),
    ],
  },
  {
    id: 'electrical', name: 'Electrical Appliances', short: '06', position: [5, 0], hazards: [
      h('damaged-cord', 'Damaged electrical cord', 'A countertop appliance cord has exposed inner wiring.', 'The cable jacket is split and the inner material is visible.', 'Stop using it, unplug safely if possible, and report it for repair or replacement.', 'Wrap the damaged section in tape and keep using the appliance.', 'Tape is not a reliable repair for exposed wiring; damaged equipment can shock or start a fire.', 'cord', 'Tape may not insulate exposed wiring reliably, leaving risk of electric shock or overheating.'),
      h('appliance-water', 'Appliance near water', 'A plugged-in appliance sits beside a wet work area.', 'An energized appliance is close to a wet surface.', 'Switch off and unplug safely, then move it to a dry area away from water.', 'Put a dry cloth between the appliance and the wet counter.', 'Water conducts electricity; a cloth does not remove the risk of shock.', 'water-appliance', 'A cloth can become wet and does not isolate the appliance from an electrical shock hazard.'),
      h('hot-appliance-electric', 'Hot appliance', 'A hot toaster oven has been left running unattended.', 'An energized appliance is operating with no one nearby.', 'Switch it off and stay nearby until it is safe to leave.', 'Move it while it is still hot to clear the counter.', 'Hot appliances can cause burns or ignite nearby items; handle only when safe.', 'toaster', 'Moving a hot powered unit risks burns, dropping it, or igniting nearby material.'),
    ],
  },
];

export function createRun() {
  const seen = new Set<string>();
  return zones.map((zone) => {
    const pool = zone.hazards.filter((item) => !seen.has(item.id));
    const hazard = pool[Math.floor(Math.random() * pool.length)];
    seen.add(hazard.id);
    return { zone, hazard };
  });
}
