/**
 * Font Awesome icons for instrument categories
 */

import type { ReactElement } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMusic,
  faDrum,
  faGuitar,
  faMicrophone,
  faCloud,
  faWaveSquare,
  faBolt,
  faRepeat,
  faKeyboard,
} from "@fortawesome/free-solid-svg-icons";

// Default music note icon
const MusicNoteIcon = <FontAwesomeIcon icon={faMusic} />;

// Drum/Percussion icon
const DrumIcon = <FontAwesomeIcon icon={faDrum} />;

// Bass icon (using wave for low frequency representation)
const BassIcon = <FontAwesomeIcon icon={faWaveSquare} />;

// Piano/Keys icon (using music note)
const PianoIcon = <FontAwesomeIcon icon={faMusic} />;

// Synth/Lead icon (waveform)
const SynthIcon = <FontAwesomeIcon icon={faWaveSquare} />;

// Strings icon (using music note)
const StringsIcon = <FontAwesomeIcon icon={faMusic} />;

// Brass/Horn icon (using music note)
const BrassIcon = <FontAwesomeIcon icon={faMusic} />;

// Guitar icon
const GuitarIcon = <FontAwesomeIcon icon={faGuitar} />;

// Vocals/Microphone icon
const VocalIcon = <FontAwesomeIcon icon={faMicrophone} />;

// FX/Effects icon (sparkle/bolt)
const FxIcon = <FontAwesomeIcon icon={faBolt} />;

// Pad/Atmosphere icon (cloud)
const PadIcon = <FontAwesomeIcon icon={faCloud} />;

// Loop icon
const LoopIcon = <FontAwesomeIcon icon={faRepeat} />;

// MIDI icon (using keyboard)
const MidiIcon = <FontAwesomeIcon icon={faKeyboard} />;

// Export MIDI icon for use elsewhere
export { MidiIcon };

// Instrument to icon mapping
const INSTRUMENT_ICONS: Record<string, ReactElement> = {
  // Drums/Percussion
  drums: DrumIcon,
  drum: DrumIcon,
  kick: DrumIcon,
  snare: DrumIcon,
  hihat: DrumIcon,
  "hi-hat": DrumIcon,
  hat: DrumIcon,
  cymbal: DrumIcon,
  tom: DrumIcon,
  perc: DrumIcon,
  percussion: DrumIcon,
  clap: DrumIcon,
  "808": DrumIcon,
  "909": DrumIcon,
  breakbeat: DrumIcon,
  beat: DrumIcon,
  groove: DrumIcon,
  shaker: DrumIcon,
  tambourine: DrumIcon,
  conga: DrumIcon,
  bongo: DrumIcon,
  rimshot: DrumIcon,
  crash: DrumIcon,
  ride: DrumIcon,

  // Bass
  bass: BassIcon,
  sub: BassIcon,
  reese: BassIcon,
  wobble: BassIcon,

  // Keys/Piano
  piano: PianoIcon,
  keys: PianoIcon,
  rhodes: PianoIcon,
  wurlitzer: PianoIcon,
  wurli: PianoIcon,
  organ: PianoIcon,
  chord: PianoIcon,
  chords: PianoIcon,

  // Synths/Lead
  synth: SynthIcon,
  lead: SynthIcon,
  pluck: SynthIcon,
  arp: SynthIcon,
  stab: SynthIcon,
  saw: SynthIcon,
  square: SynthIcon,

  // Pad/Atmosphere
  pad: PadIcon,
  atmosphere: PadIcon,
  atmos: PadIcon,
  ambient: PadIcon,
  texture: PadIcon,

  // Strings
  strings: StringsIcon,
  violin: StringsIcon,
  cello: StringsIcon,
  viola: StringsIcon,
  orchestra: StringsIcon,
  orchestral: StringsIcon,
  ensemble: StringsIcon,

  // Brass/Winds
  brass: BrassIcon,
  trumpet: BrassIcon,
  horn: BrassIcon,
  sax: BrassIcon,
  saxophone: BrassIcon,
  flute: BrassIcon,
  clarinet: BrassIcon,
  trombone: BrassIcon,

  // Guitar
  guitar: GuitarIcon,
  gtr: GuitarIcon,
  acoustic: GuitarIcon,
  electric: GuitarIcon,
  strum: GuitarIcon,
  riff: GuitarIcon,

  // Vocals
  vocal: VocalIcon,
  vox: VocalIcon,
  voice: VocalIcon,
  acapella: VocalIcon,
  choir: VocalIcon,
  spoken: VocalIcon,

  // FX
  fx: FxIcon,
  sfx: FxIcon,
  riser: FxIcon,
  impact: FxIcon,
  sweep: FxIcon,
  noise: FxIcon,
  foley: FxIcon,
  whoosh: FxIcon,
  hit: FxIcon,

  // Loop/Sample
  loop: LoopIcon,
  "one-shot": LoopIcon,
  oneshot: LoopIcon,
  sample: LoopIcon,
  stem: LoopIcon,
  fill: DrumIcon,
  transition: FxIcon,
  melody: MusicNoteIcon,
  hook: MusicNoteIcon,
};

/**
 * Get the appropriate icon for an instrument
 * @param instrument - The instrument name (case-insensitive)
 * @returns The SVG icon element
 */
export function getInstrumentIcon(instrument: string | null): ReactElement {
  if (!instrument) {
    return MusicNoteIcon;
  }

  const normalizedInstrument = instrument.toLowerCase();
  return INSTRUMENT_ICONS[normalizedInstrument] || MusicNoteIcon;
}

/**
 * Get the icon category for an instrument (for styling purposes)
 * @param instrument - The instrument name
 * @returns The category name
 */
export function getInstrumentCategory(instrument: string | null): string {
  if (!instrument) return "default";

  const lower = instrument.toLowerCase();

  // Drums/Percussion
  if (["drums", "drum", "kick", "snare", "hihat", "hi-hat", "hat", "cymbal", "tom", "perc", "percussion", "clap", "808", "909", "breakbeat", "beat", "groove", "shaker", "tambourine", "conga", "bongo", "rimshot", "crash", "ride", "fill"].includes(lower)) {
    return "drums";
  }

  // Bass
  if (["bass", "sub", "reese", "wobble"].includes(lower)) {
    return "bass";
  }

  // Keys
  if (["piano", "keys", "rhodes", "wurlitzer", "wurli", "organ", "chord", "chords"].includes(lower)) {
    return "keys";
  }

  // Synth
  if (["synth", "lead", "pluck", "arp", "stab", "saw", "square"].includes(lower)) {
    return "synth";
  }

  // Pad
  if (["pad", "atmosphere", "atmos", "ambient", "texture"].includes(lower)) {
    return "pad";
  }

  // Strings
  if (["strings", "violin", "cello", "viola", "orchestra", "orchestral", "ensemble"].includes(lower)) {
    return "strings";
  }

  // Brass
  if (["brass", "trumpet", "horn", "sax", "saxophone", "flute", "clarinet", "trombone"].includes(lower)) {
    return "brass";
  }

  // Guitar
  if (["guitar", "gtr", "acoustic", "electric", "strum", "riff"].includes(lower)) {
    return "guitar";
  }

  // Vocal
  if (["vocal", "vox", "voice", "acapella", "choir", "spoken"].includes(lower)) {
    return "vocal";
  }

  // FX
  if (["fx", "sfx", "riser", "impact", "sweep", "noise", "foley", "whoosh", "hit", "transition"].includes(lower)) {
    return "fx";
  }

  return "default";
}

/**
 * Get the icon for a sample type (audio or midi)
 * @param sampleType - The sample type
 * @returns The appropriate icon element
 */
export function getSampleTypeIcon(sampleType: string | null): ReactElement {
  if (sampleType === "midi") {
    return MidiIcon;
  }
  return MusicNoteIcon;
}
