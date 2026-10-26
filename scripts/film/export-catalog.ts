#!/usr/bin/env tsx
/**
 * Writes the director's vocabulary as JSON for apps that write shots without importing this code (shorts-automation keeps a
 * copy as src/my-video/directorCatalog.json and checks AI-written shots against it before render).
 *
 *   tsx scripts/film/export-catalog.ts [--out director-catalog.json]
 */
import * as fs from "fs";
import { ACTIONS, MOVES, PLACE_NAMES, SHOT_SIZES, catalog, placeThings } from "../../src/stickman/film/direct";
import { MOODS, PERSON_POSES, PROP_KINDS } from "../../src/stickman/film/schema";
import { PROPS } from "../../src/stickman/film/props";
import { AGES, BEARDS, BUILDS, GENDERS, HAIRS, OUTFITS, SKINS } from "../../src/stickman/film/avatar";

const args = process.argv.slice(2);
const out = args[args.indexOf("--out") + 1] && args.includes("--out") ? args[args.indexOf("--out") + 1] : "director-catalog.json";
const data = {
  version: 1,
  places: PLACE_NAMES, actions: ACTIONS, shotSizes: SHOT_SIZES, moves: MOVES, feels: ["steady", "handheld"],
  times: ["day", "dusk", "night", "rain"], fx: ["rain", "dust", "leaves", "sunrays", "glow"],
  poses: PERSON_POSES, moods: MOODS,
  props: Object.fromEntries(PROP_KINDS.map((k) => [k, { mount: PROPS[k].mount, seat: !!PROPS[k].seat, top: !!PROPS[k].top }])),
  placeThings: Object.fromEntries(PLACE_NAMES.map((p) => [p, placeThings(p)])),
  avatar: { age: AGES, gender: GENDERS, build: BUILDS, hair: HAIRS, beard: BEARDS, outfit: OUTFITS, skin: SKINS },
  text: catalog(),
};
fs.writeFileSync(out, JSON.stringify(data, null, 1));
console.log(`✓ ${out}: ${PLACE_NAMES.length} places, ${ACTIONS.length} actions, ${PROP_KINDS.length} props`);
