/**
 * @file Embed.actions.ts
 * Defines state change actions for embed pages.
 */

export enum EmbedActionTypes {
  'EMBED_CURRENT_TRACK_UPDATE' = '[Embed] CURRENT_TRACK_UPDATE',
  'EMBED_APPEND_TRACKS' = '[Embed] APPEND_TRACKS',
  'EMBED_SHOW_SHARE_DIALOG' = '[Embed] SHOW_SHARE_DIALOG',
  'EMBED_HIDE_SHARE_DIALOG' = '[Embed] HIDE_SHARE_DIALOG',
  'EMBED_TOGGLE_SHARE_DIALOG_SHOWN' = '[Embed] TOGGLE_SHARE_DIALOG_SHOWN',
  'EMBED_SHOW_FOLLOW_DIALOG' = '[Embed] SHOW_FOLLOW_DIALOG',
  'EMBED_HIDE_FOLLOW_DIALOG' = '[Embed] HIDE_FOLLOW_DIALOG',
  'EMBED_TOGGLE_FOLLOW_DIALOG_SHOWN' = '[Embed] TOGGLE_FOLLOW_DIALOG_SHOWN',
  'EMBED_SHOW_SUPPORT_DIALOG' = '[Embed] SHOW_SUPPORT_DIALOG',
  'EMBED_HIDE_SUPPORT_DIALOG' = '[Embed] HIDE_SUPPORT_DIALOG',
  'EMBED_TOGGLE_SUPPORT_DIALOG_SHOWN' = '[Embed] TOGGLE_SUPPORT_DIALOG_SHOWN'
}

export type EmbedAction = {
  type: EmbedActionTypes;
  payload?: any;
};
