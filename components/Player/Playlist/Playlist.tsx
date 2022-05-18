/**
 * @file Playlist.tsx
 * Comment to list player's audio tracks that can be used to change currently
 * playing track.
 */

import { useContext } from 'react';
import clsx from 'clsx';
import PlayerContext from '@contexts/PlayerContext';
import { PlayerActionTypes } from '@states/player/Player.actions';
import PrxImage from '@components/PrxImage';
import styles from './Playlist.module.scss';

const Playlist = () => {
  const {
    imageUrl: defaultThumbUrl,
    state,
    dispatch
  } = useContext(PlayerContext);
  const { tracks, currentTrackIndex } = state;

  const handleTrackClick = (index: number) => () => {
    dispatch({
      type: PlayerActionTypes.PLAYER_UPDATE_CURRENT_TRACK_INDEX,
      payload: index
    });
    dispatch({
      type: PlayerActionTypes.PLAYER_PLAY
    });
  };

  return (
    tracks && (
      <div className={styles.playlist}>
        {tracks.map((track, index) => {
          const { guid, title, imageUrl, duration } = track;
          const thumbSrc = imageUrl || defaultThumbUrl;
          return (
            <button
              type="button"
              className={clsx(styles.track, {
                [styles.isCurrentTrack]: index === currentTrackIndex
              })}
              key={guid}
              onClick={handleTrackClick(index)}
            >
              {thumbSrc ? (
                <PrxImage
                  src={thumbSrc}
                  alt={`Thumbnail for "${title}".`}
                  layout="intrinsic"
                  width={styles.thumbnailWidth}
                  height={styles.thumbnailWidth}
                />
              ) : (
                <span />
              )}
              <span className={styles.trackTitle}>{title}</span>
              <span className={styles.trackDuration}>{duration}</span>
            </button>
          );
        })}
      </div>
    )
  );
};

export default Playlist;
