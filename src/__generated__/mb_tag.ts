/**
 * !!! This file is autogenerated do not edit by hand !!!
 *
 * Generated by: @databases/pg-schema-print-types
 * Checksum: 2su/Jz0asB9JxfhekKmje7acg2vDp2mvi4eUV/xdsIzCqab3fujEyVPWA9ZSbDYt5ghw5Fr1r3NFU4ozIcDSqg==
 */

/* eslint-disable */
// tslint:disable

interface MbTag {
  /**
   * @default nextval('mb_tag_id_seq'::regclass)
   */
  id: number & {readonly __brand?: 'mb_tag_id'}
  name: string
  ref_count: number
}
export default MbTag;

interface MbTag_InsertParameters {
  /**
   * @default nextval('mb_tag_id_seq'::regclass)
   */
  id?: number & {readonly __brand?: 'mb_tag_id'}
  name: string
  ref_count: number
}
export type {MbTag_InsertParameters}
