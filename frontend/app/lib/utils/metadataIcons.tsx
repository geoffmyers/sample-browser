/**
 * Font Awesome icons for metadata fields (genre, key, tempo, etc.)
 */

import type { ReactElement } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMusic,
  faClock,
  faTag,
  faChartBar,
  faRepeat,
  faPlay,
  faHome,
  faMicrochip,
  faBolt,
  faCloud,
  faRecordVinyl,
  faHeart,
  faGuitar,
  faStar,
  faGlobe,
  faFilm,
  faWind,
  faDrum,
} from "@fortawesome/free-solid-svg-icons";

// Key signature icon (music note)
export const KeyIcon = <FontAwesomeIcon icon={faMusic} />;

// Tempo/BPM icon (clock representing rhythm/timing)
export const TempoIcon = <FontAwesomeIcon icon={faDrum} />;

// Duration/clock icon
export const DurationIcon = <FontAwesomeIcon icon={faClock} />;

// Tag icon (for descriptors)
export const TagIcon = <FontAwesomeIcon icon={faTag} />;

// Length/bars icon (chart bars)
export const BarsIcon = <FontAwesomeIcon icon={faChartBar} />;

// Loop icon
export const LoopIcon = <FontAwesomeIcon icon={faRepeat} />;

// One-shot icon
export const OneShotIcon = <FontAwesomeIcon icon={faPlay} />;

// Genre icons mapping
const GENRE_ICONS: Record<string, ReactElement> = {
  // Electronic genres
  house: <FontAwesomeIcon icon={faHome} />,
  techno: <FontAwesomeIcon icon={faMicrochip} />,
  trance: <FontAwesomeIcon icon={faWind} />,
  dubstep: <FontAwesomeIcon icon={faBolt} />,
  dnb: <FontAwesomeIcon icon={faBolt} />,
  "drum and bass": <FontAwesomeIcon icon={faBolt} />,
  ambient: <FontAwesomeIcon icon={faCloud} />,
  edm: <FontAwesomeIcon icon={faChartBar} />,
  electro: <FontAwesomeIcon icon={faBolt} />,

  // Hip-hop/Urban
  hiphop: <FontAwesomeIcon icon={faRecordVinyl} />,
  "hip-hop": <FontAwesomeIcon icon={faRecordVinyl} />,
  trap: <FontAwesomeIcon icon={faRecordVinyl} />,
  rnb: <FontAwesomeIcon icon={faHeart} />,
  "r&b": <FontAwesomeIcon icon={faHeart} />,

  // Rock/Pop
  rock: <FontAwesomeIcon icon={faGuitar} />,
  pop: <FontAwesomeIcon icon={faStar} />,
  indie: <FontAwesomeIcon icon={faGuitar} />,

  // Jazz/Soul
  jazz: <FontAwesomeIcon icon={faMusic} />,
  soul: <FontAwesomeIcon icon={faHeart} />,
  funk: <FontAwesomeIcon icon={faMusic} />,

  // World/Reggae
  reggae: <FontAwesomeIcon icon={faGlobe} />,
  latin: <FontAwesomeIcon icon={faGlobe} />,
  world: <FontAwesomeIcon icon={faGlobe} />,

  // Classical/Orchestral
  classical: <FontAwesomeIcon icon={faMusic} />,
  orchestral: <FontAwesomeIcon icon={faMusic} />,

  // Cinematic
  cinematic: <FontAwesomeIcon icon={faFilm} />,
  film: <FontAwesomeIcon icon={faFilm} />,

  // Lofi/Chill
  lofi: <FontAwesomeIcon icon={faCloud} />,
  "lo-fi": <FontAwesomeIcon icon={faCloud} />,
  chill: <FontAwesomeIcon icon={faCloud} />,
};

// Default genre icon (music note)
const DefaultGenreIcon = <FontAwesomeIcon icon={faMusic} />;

/**
 * Get the appropriate icon for a genre
 */
export function getGenreIcon(genre: string | null): ReactElement {
  if (!genre) return DefaultGenreIcon;
  const normalizedGenre = genre.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");

  // Try exact match first
  if (GENRE_ICONS[genre.toLowerCase()]) {
    return GENRE_ICONS[genre.toLowerCase()];
  }

  // Try normalized match
  for (const [key, icon] of Object.entries(GENRE_ICONS)) {
    if (key.replace(/\s+/g, "").replace(/-/g, "") === normalizedGenre) {
      return icon;
    }
  }

  return DefaultGenreIcon;
}
