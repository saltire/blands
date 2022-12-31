/**
 * !!! This file is autogenerated do not edit by hand !!!
 *
 * Generated by: @databases/pg-schema-print-types
 * Checksum: T+MEt/B86NmlOQlPlwca4Cl87lHG8ZeSin7iTR9aUTidmQucrk6BEF/79HRMqvfXV6ooTi8Z9afa1Gh8emuxNw==
 */

/* eslint-disable */
// tslint:disable

interface MbGenre {
  comment: string
  edits_pending: number
  gid: string
  /**
   * @default nextval('mb_genre_id_seq'::regclass)
   */
  id: number & {readonly __brand?: 'mb_genre_id'}
  last_updated: Date
  name: string
}
export default MbGenre;

interface MbGenre_InsertParameters {
  comment: string
  edits_pending: number
  gid: string
  /**
   * @default nextval('mb_genre_id_seq'::regclass)
   */
  id?: number & {readonly __brand?: 'mb_genre_id'}
  last_updated: Date
  name: string
}
export type {MbGenre_InsertParameters}