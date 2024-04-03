/**
 * @file FollowMenu.tsx
 * Provides chat style message feed for closed captions.
 */

import type React from 'react';
import type { CSSProperties } from 'react';
import type { IAudioData } from '@interfaces/data';
import type {
  IRssPodcastTranscriptJson,
  IRssPodcastTranscriptJsonSegment
} from '@interfaces/data/IRssPodcast';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import clsx from 'clsx';
import PlayerContext from '@contexts/PlayerContext';
import IconButton from '@components/IconButton';
import ThemeVars from '@components/ThemeVars';
import generateSpeakerColor from '@lib/generate/string/generateSpeakerColor';
import getScrollParent from '@lib/parse/dom/getScrollParent';
import getVttCueSpeaker from '@lib/parse/dom/getVttCueSpeaker';
import VerticalAlignCenterIcon from '@svg/icons/VerticalAlignCenter.svg';
import styles from './ClosedCaptionsFeed.module.scss';

export interface IClosedCaptionsProps {
  speakerColors?: string[];
}

type CuePosition = 'left' | 'right';

type CaptionProps = {
  cue: VTTCue;
  segments?: IRssPodcastTranscriptJsonSegment[];
  showSpeaker?: boolean;
  colors?: Map<string, string>;
  position?: 'left' | 'right';
  isCurrent?: boolean;
};

type SegmentProps = {
  data: IRssPodcastTranscriptJsonSegment;
  inCurrentCue: boolean;
};

const getCurrentCue = (textTrack: TextTrack) =>
  [...(textTrack?.activeCues || [])].at(0) as VTTCue;

const Segment = ({ data, inCurrentCue }: SegmentProps) => {
  const { audioElm } = useContext(PlayerContext);
  const { body } = data;
  const [spoken, setSpoken] = useState(!inCurrentCue);

  /**
   * Setup audio element event handlers.
   */
  useEffect(() => {
    const handleUpdate = () => {
      setSpoken(() => data.startTime <= audioElm?.currentTime);
    };

    if (inCurrentCue) {
      audioElm?.addEventListener('timeupdate', handleUpdate);
    }

    return () => {
      audioElm?.removeEventListener('timeupdate', handleUpdate);
    };
  }, [audioElm, data.startTime, inCurrentCue]);

  return (
    <span className={styles.segment} data-spoken={spoken}>
      {body}
    </span>
  );
};

const Caption = ({
  cue,
  segments,
  showSpeaker,
  colors,
  position,
  isCurrent
}: CaptionProps) => {
  const currentCaptionRef = useRef<HTMLDivElement>();
  const scrollElementRef = useRef<Element>();
  const { seekTo } = useContext(PlayerContext);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [, speaker, caption] =
    cue.text.replace('\n', ' ').match(/^(?:<v\s+([^>]+)>)?(.+)/) || [];
  const cueSegments = useMemo(
    () =>
      isCurrent &&
      segments
        ?.filter(
          ({ startTime, endTime }) =>
            startTime >= cue.startTime && endTime <= cue.endTime
        )
        .reduce((a, currentSegment) => {
          const aClone = [...a];
          const segment = aClone.pop();

          if (!segment || currentSegment.startTime > segment.endTime) {
            return [...a, currentSegment];
          }

          const updatedSegment = {
            ...segment,
            body: segment.body + currentSegment.body
          };

          return [...aClone, updatedSegment];
        }, [] as IRssPodcastTranscriptJsonSegment[]),
    [segments, cue, isCurrent]
  );
  const hasSegments = !!cueSegments?.length;
  const hasText = hasSegments || !!caption.trim().length;
  const color = colors?.get(speaker);
  const rootProps = {
    className: clsx(styles.caption),
    'data-position': position || 'left',
    ...(isCurrent && {
      'data-current': ''
    }),
    ...(color && {
      style: { '--cc-speaker--color': color } as CSSProperties
    }),
    ...(isCurrent && { ref: currentCaptionRef })
  };

  const scrollToCurrentBlock = (smooth?: boolean) => {
    currentCaptionRef.current?.scrollIntoView({
      block: 'center',
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  const checkCurrentCaptionOffScreen = () => {
    const currentBlockRect = currentCaptionRef.current?.getBoundingClientRect();
    const scrollingElement = scrollElementRef.current;
    const scrollAreaRect = scrollingElement.getBoundingClientRect();
    const offScreen =
      (!!currentBlockRect && currentBlockRect?.top > scrollAreaRect.bottom) ||
      currentBlockRect?.bottom < scrollAreaRect.top;

    return offScreen;
  };

  const handleJumpBtnClick = () => {
    setShowJumpButton(false);
    scrollToCurrentBlock();
  };

  function handleClick() {
    seekTo(cue.startTime);
  }

  useEffect(() => {
    scrollElementRef.current =
      scrollElementRef.current ||
      (currentCaptionRef.current && getScrollParent(currentCaptionRef.current));

    const handleScroll = () => {
      if (checkCurrentCaptionOffScreen()) {
        setShowJumpButton(true);
      } else {
        setShowJumpButton(false);
      }
    };

    if (isCurrent && currentCaptionRef.current) {
      if (!checkCurrentCaptionOffScreen()) {
        scrollToCurrentBlock(true);
      } else {
        setShowJumpButton(true);
      }

      scrollElementRef.current?.addEventListener('scroll', handleScroll);
    }

    return () => {
      scrollElementRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [isCurrent]);

  useEffect(() => {
    scrollToCurrentBlock();
  }, []);

  if (!hasText) return null;

  return (
    <>
      {showJumpButton && isCurrent && (
        <IconButton
          type="button"
          className={styles.jumpButton}
          style={
            {
              ...(color && {
                '--jump-button--color': color,
                '--iconButton-color': color
              })
            } as CSSProperties
          }
          onClick={handleJumpBtnClick}
        >
          <VerticalAlignCenterIcon />
        </IconButton>
      )}
      <div {...rootProps}>
        {showSpeaker && speaker && (
          <cite className={styles.speaker}>{speaker}</cite>
        )}
        <button
          type="button"
          className={styles.captionBody}
          onClick={handleClick}
        >
          {hasSegments
            ? cueSegments.map((s) => (
                <Segment
                  data={s}
                  inCurrentCue={isCurrent}
                  key={`${s.body}:${s.startTime}`}
                />
              ))
            : caption}
        </button>
      </div>
    </>
  );
};

const ClosedCaptionsFeed: React.FC<IClosedCaptionsProps> = ({
  speakerColors
}) => {
  const { audioElm, state } = useContext(PlayerContext);
  const { tracks, currentTrackIndex } = state;
  const currentTrack = tracks[currentTrackIndex] || ({} as IAudioData);

  const scrollAreaRef = useRef<HTMLDivElement>();

  const [currentCue, setCurrentCue] = useState<VTTCue>();
  const [transcriptData, setTranscriptData] =
    useState<IRssPodcastTranscriptJson>();

  const recentCues = [...(currentCue?.track?.cues || [])].slice(
    0 // Math.max(cueIndex - 20, 0),
    // cueIndex + 3
  ) as VTTCue[];
  const speakersColorMap = useRef(new Map<string, string>());

  const cuePositions = useMemo(() => {
    const positionsMap = new Map<string, CuePosition>();
    const cues = [...(currentCue?.track?.cues || [])] as VTTCue[];

    if (cues.length) {
      let previousSpeaker = getVttCueSpeaker(cues[0]);
      let currentPosition: CuePosition = 'left';

      cues.forEach((cue) => {
        const cueSpeaker = getVttCueSpeaker(cue);

        if (cueSpeaker !== previousSpeaker) {
          if (!speakersColorMap.current.has(cueSpeaker)) {
            const speakerNumber = speakersColorMap.current.size;
            const speakerColor = generateSpeakerColor(
              speakerNumber,
              speakerColors,
              35,
              81
            );
            speakersColorMap.current.set(cueSpeaker, speakerColor);
          }

          previousSpeaker = cueSpeaker;
          currentPosition = currentPosition === 'left' ? 'right' : 'left';
        }

        positionsMap.set(cue.id, currentPosition);
      });
    }

    return positionsMap;
  }, [currentCue, speakerColors]);

  const { transcripts } = currentTrack;
  const transcriptJson = transcripts?.find((t) => t.type.includes('json'));

  const captionsClassNames = clsx(styles.captions, {
    [styles.noSpeakers]: speakersColorMap.current.size <= 1
  });

  const updateCurrentCue = useCallback((textTrack: TextTrack) => {
    const cue = getCurrentCue(textTrack);

    // Fallback to previous cue to prevent captions not being rendered during
    // pauses in dialog (no active cues.)
    setCurrentCue((previousCue) => cue || previousCue);
  }, []);

  const handleCueChange = useMemo(
    () => (e: Event) => {
      updateCurrentCue(e.target as TextTrack);
    },
    [updateCurrentCue]
  );

  const handleAddTrack = useMemo(
    () => (e: TrackEvent) => {
      updateCurrentCue(e.track);
      // eslint-disable-next-line no-param-reassign
      e.track.mode = 'showing';
      e.track.addEventListener('cuechange', handleCueChange);
    },
    [handleCueChange, updateCurrentCue]
  );

  const handleRemoveTrack = useMemo(
    () => () => {
      // Clear current cue when tracks are about to change.
      setCurrentCue(null);
    },
    []
  );

  /**
   * Setup audio element event handlers.
   */
  useEffect(() => {
    const textTracks = audioElm?.textTracks;

    textTracks.addEventListener('addtrack', handleAddTrack);
    textTracks.addEventListener('removetrack', handleRemoveTrack);

    [...(textTracks || [])].forEach((track) => {
      if (track.kind === 'captions') {
        track.addEventListener('cuechange', handleCueChange);

        updateCurrentCue(track);
      }
    });

    return () => {
      textTracks.removeEventListener('addtrack', handleAddTrack);
      textTracks.removeEventListener('removetrack', handleRemoveTrack);

      [...(textTracks || [])].forEach((track) => {
        if (track.kind === 'captions') {
          track.removeEventListener('cuechange', handleCueChange);
        }
      });
    };
  }, [
    audioElm,
    handleAddTrack,
    handleCueChange,
    handleRemoveTrack,
    updateCurrentCue
  ]);

  useEffect(() => {
    if (!transcriptJson?.url) return;

    (async () => {
      const jsonData = await fetch(
        transcriptJson.url
      ).then<IRssPodcastTranscriptJson>((resp) => resp.ok && resp.json());

      setTranscriptData(jsonData);
    })();
  }, [transcriptJson?.url]);

  const previousSpeaker = useRef(getVttCueSpeaker(currentCue));

  const renderedCaptions = useMemo(() => {
    let lastSpeakerChangeIndex = 0;
    return recentCues?.map((cue, index) => {
      const cueSpeaker = getVttCueSpeaker(cue);
      const speakerChanged = cueSpeaker !== previousSpeaker.current;
      // Show speaker when speaker changes or every 5 cues od the same speaker.
      const showSpeaker =
        speakerChanged || !((index - lastSpeakerChangeIndex) % 5);
      const isCurrent = cue.id === currentCue.id;

      if (speakerChanged) {
        lastSpeakerChangeIndex = index;
        previousSpeaker.current = cueSpeaker;
      }

      return (
        <Caption
          cue={cue}
          segments={transcriptData?.segments}
          colors={speakersColorMap.current}
          showSpeaker={showSpeaker}
          position={cuePositions.get(cue.id) || 'left'}
          isCurrent={isCurrent}
          key={cue.id}
        />
      );
    });
  }, [cuePositions, currentCue?.id, recentCues, transcriptData?.segments]);

  if (!transcripts) return null;

  return (
    <div ref={scrollAreaRef} className={styles.root}>
      <ThemeVars theme="ClosedCaptionsFeed" cssProps={styles} />
      <div className={captionsClassNames} aria-hidden>
        <div style={{ gridColumn: '1 / -1' }}>&nbsp;</div>
        {renderedCaptions}
      </div>
    </div>
  );
};

export default ClosedCaptionsFeed;
