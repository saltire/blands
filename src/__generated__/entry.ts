/**
 * !!! This file is autogenerated do not edit by hand !!!
 *
 * Generated by: @databases/pg-schema-print-types
 * Checksum: vjBxoBdPQesJpqnsFgge62aXbT+z/nmav7p5sbR1vuw5WLo4rH8DolKpLKfK0eyEueY+8WaxcfXRkUZP6lcY5w==
 */

/* eslint-disable */
// tslint:disable

import Band from './band'
import Battle from './battle'

interface Entry {
  band_id: Band['id']
  battle_id: Battle['id']
  buzz_awarded: (number) | null
  place: (number) | null
}
export default Entry;

interface Entry_InsertParameters {
  band_id: Band['id']
  battle_id: Battle['id']
  buzz_awarded?: (number) | null
  place?: (number) | null
}
export type {Entry_InsertParameters}
