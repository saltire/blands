/**
 * !!! This file is autogenerated do not edit by hand !!!
 *
 * Generated by: @databases/pg-schema-print-types
 * Checksum: HdnQsIiZxvqGzl/WV9NMpn75uKRRNt9NsYe9Mi9nBMcZtnq/JqRfNJt5t0h0JUTW5ND5yo1S4EIgTnriTpTKpA==
 */

/* eslint-disable */
// tslint:disable

import MbGenre from './mb_genre'
import MbLink from './mb_link'

interface MbLGenreGenre {
  edits_pending: number
  entity0: MbGenre['id']
  entity0_credit: string
  entity1: MbGenre['id']
  entity1_credit: string
  /**
   * @default nextval('mb_l_genre_genre_id_seq'::regclass)
   */
  id: number & {readonly __brand?: 'mb_l_genre_genre_id'}
  last_updated: Date
  link: MbLink['id']
  link_order: number
}
export default MbLGenreGenre;

interface MbLGenreGenre_InsertParameters {
  edits_pending: number
  entity0: MbGenre['id']
  entity0_credit: string
  entity1: MbGenre['id']
  entity1_credit: string
  /**
   * @default nextval('mb_l_genre_genre_id_seq'::regclass)
   */
  id?: number & {readonly __brand?: 'mb_l_genre_genre_id'}
  last_updated: Date
  link: MbLink['id']
  link_order: number
}
export type {MbLGenreGenre_InsertParameters}
