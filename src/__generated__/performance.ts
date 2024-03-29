/**
 * !!! This file is autogenerated do not edit by hand !!!
 *
 * Generated by: @databases/pg-schema-print-types
 * Checksum: Zf+q80gFUsmhrtqDyLXyoZxKc8bx9AEyFBF6m50GkK9p/H4KuuseoZd5jMvbVRJjb0ATNV9eNkXb6FQbcv449g==
 */

/* eslint-disable */
// tslint:disable

import Band from './band'
import Battle from './battle'
import Song from './song'

interface Performance {
  band_id: Band['id']
  battle_id: Battle['id']
  round_index: number & {readonly __brand?: 'performance_round_index'}
  score: number
  song_id: Song['id']
}
export default Performance;

interface Performance_InsertParameters {
  band_id: Band['id']
  battle_id: Battle['id']
  round_index: number & {readonly __brand?: 'performance_round_index'}
  score: number
  song_id: Song['id']
}
export type {Performance_InsertParameters}
