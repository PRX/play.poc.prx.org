/**
 * @file PlayButton.tsx
 * Play button component to toggle playing state of player.
 */

import type React from 'react';
import { useContext } from 'react';
import PlayerContext from '@contexts/PlayerContext';
import { PlayerActionTypes } from '@states/player/Player.actions';
import IconButton from '@components/IconButton';
import PlayArrowIcon from '@svg/icons/PlayArrow.svg';
import PauseIcon from '@svg/icons/Pause.svg';
import styles from './PlayButton.module.scss';

export interface IPlayButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const PlayButton: React.FC<IPlayButtonProps> = ({ className, ...props }) => {
  const { state, dispatch } = useContext(PlayerContext);
  const { playing } = state;

  const handleClick = () => {
    dispatch({ type: PlayerActionTypes.PLAYER_TOGGLE_PLAYING });
  };

  return (
    <IconButton
      className={styles.root}
      {...props}
      type="button"
      onClick={handleClick}
    >
      {!playing ? (
        <PlayArrowIcon aria-label="Play" />
      ) : (
        <PauseIcon aria-label="Pause" />
      )}
    </IconButton>
  );
};

export default PlayButton;
