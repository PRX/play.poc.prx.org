/**
 * @file NextButton.tsx
 * Next button component to skip to next track in playlist.
 */

import React, { useContext } from 'react';
import PlayerContext from '@contexts/PlayerContext';
import { PlayerActionTypes } from '@states/player/Player.actions';
import IconButton from '@components/IconButton';
import NextIcon from '@svg/icons/Next.svg';

export interface INextButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const NextButton: React.FC<INextButtonProps> = ({ ...props }) => {
  const { dispatch } = useContext(PlayerContext);

  const handleClick = () => {
    dispatch({
      type: PlayerActionTypes.PLAYER_NEXT_TRACK
    });
  };

  return (
    <IconButton {...props} type="button" onClick={handleClick}>
      <NextIcon aria-label="Next Track" />
    </IconButton>
  );
};

export default NextButton;
