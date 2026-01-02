// world.js
const WORLD = {
  startLocationId: "camp",

  locations: {
    camp: {
      title: "Wrecked Camp",
      desc: "A cold firepit. Torn canvas. Footprints lead toward scrub and stone.",
      exits: { trail: "ridge" },
      loot: ["fiber", "stick", "scrap"],
      actions: ["search", "rest", "craft"]
    },

    ridge: {
      title: "Wind-Raked Ridge",
      desc: "The ground drops away into fog. Something down there is breathing slowly.",
      exits: { back: "camp", path: "gully" },
      loot: ["stone", "stick"],
      actions: ["search", "scout"]
    },

    gully: {
      title: "Dry Gully",
      desc: "A slit of land littered with bones and rust.",
      exits: { up: "ridge", east: "gate" },
      loot: ["scrap", "fiber"],
      actions: ["search"]
    },

    gate: {
      title: "Broken Gate",
      desc: "A fallen archway of old brick. Beyond it, the outline of a small settlement.",
      exits: { west: "gully", in: "town" },
      loot: [],
      actions: []
    },

    town: {
      title: "Bridgetown Outpost",
      desc: "Lantern light. Muted voices. Traders watch you like you are a weather event.",
      exits: { out: "gate" },
      loot: [],
      actions: ["talk", "rest"]
    }
  },

  items: {
    stick: { name: "Stick", desc: "Light wood. Useful for tools." },
    stone: { name: "Stone", desc: "Sharp enough if you insist." },
    fiber: { name: "Fiber", desc: "Twist it, braid it, bind it." },
    scrap: { name: "Scrap", desc: "Bent metal. Potential." },
    rope:  { name: "Rope", desc: "A promise you can climb." }
  },

  recipes: [
    {
      id: "rope",
      name: "Rope",
      requires: { fiber: 2 },
      gives: { rope: 1 },
      note: "Unlocks safer travel later."
    }
  ]
};
