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
import generateSpeakerColor from '@lib/generate/string/generateSpeakerColor';
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

const getCueSpeaker = (cue: VTTCue) =>
  cue?.text.match(/^(?:<v\s+([^>]+)>)/)?.[1] || null;

const getCurrentCue = (audioElm: HTMLAudioElement) => {
  const textTrack = [...(audioElm?.textTracks || [])].find(
    (track) => track.mode === 'showing'
  );

  return [...(textTrack.activeCues || [])].at(0) as VTTCue;
};

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
  const { seekTo } = useContext(PlayerContext);
  const [cueEnded, setCueEnded] = useState(false);
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
    ...(cueEnded && {
      'data-ended': ''
    }),
    ...(color && {
      style: { '--cc-speaker--color': color } as CSSProperties
    })
  };

  function handleClick() {
    seekTo(cue.startTime);
  }

  useEffect(() => {
    function handleCueExit() {
      setCueEnded(true);
    }

    cue.addEventListener('exit', handleCueExit);

    return () => {
      cue.removeEventListener('exit', handleCueExit);
    };
  }, [cue]);

  if (!hasText) return null;

  return (
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
  );
};

const ClosedCaptionsFeed: React.FC<IClosedCaptionsProps> = ({
  speakerColors
}) => {
  const { audioElm, state } = useContext(PlayerContext);
  const { tracks, currentTrackIndex } = state;
  const currentTrack = tracks[currentTrackIndex] || ({} as IAudioData);

  const scrollAreaRef = useRef<HTMLDivElement>();

  const [currentCue, setCurrentCue] = useState<VTTCue>(getCurrentCue(audioElm));
  const [transcriptData, setTranscriptData] =
    useState<IRssPodcastTranscriptJson>();

  const cueIndex = [...(currentCue?.track?.cues || [])].findIndex(
    (c) => c.id === currentCue.id
  );
  const recentCues = [...(currentCue?.track?.cues || [])].slice(
    0, // Math.max(cueIndex - 20, 0),
    cueIndex + 1
  ) as VTTCue[];
  const speakersColorMap = useRef(new Map<string, string>());

  const getCuePositions = useMemo(
    () => () => {
      const positionsMap = new Map<string, CuePosition>();
      const cues = [...(currentCue?.track?.cues || [])] as VTTCue[];

      if (cues.length) {
        let previousSpeaker = getCueSpeaker(cues[0]);
        let currentPosition: CuePosition = 'left';

        cues.forEach((cue) => {
          const cueSpeaker = getCueSpeaker(cue);

          if (cueSpeaker !== previousSpeaker) {
            previousSpeaker = cueSpeaker;
            currentPosition = currentPosition === 'left' ? 'right' : 'left';
          }

          positionsMap.set(cue.id, currentPosition);
        });
      }

      return positionsMap;
    },
    [currentCue]
  );
  const cuePositions = getCuePositions();

  const { transcripts } = currentTrack;
  const transcriptJson = transcripts?.find((t) => t.type.includes('json'));

  recentCues.forEach((cue) => {
    const speaker = getCueSpeaker(cue);

    if (speaker && !speakersColorMap.current.has(speaker)) {
      const speakerNumber = speakersColorMap.current.size;
      const speakerColor = generateSpeakerColor(
        speakerNumber,
        speakerColors,
        35,
        81
      );

      speakersColorMap.current.set(speaker, speakerColor);
    }
  });

  const captionsClassNames = clsx(styles.captions, {
    [styles.noSpeakers]: !speakersColorMap.current.size
  });

  const updateCurrentCue = useCallback(() => {
    const textTrack = [...(audioElm?.textTracks || [])].find(
      (track) => track.mode === 'showing'
    );

    [...(textTrack.activeCues || [])].forEach((c: VTTCue) => {
      setCurrentCue(c);
    });
  }, [audioElm?.textTracks]);

  const handleCueChange = useMemo(
    () => () => {
      updateCurrentCue();
    },
    [updateCurrentCue]
  );

  /**
   * Setup audio element event handlers.
   */
  useEffect(() => {
    [...(audioElm?.textTracks || [])].forEach((track) => {
      if (track.kind === 'captions') {
        track.addEventListener('cuechange', handleCueChange);
        updateCurrentCue();
      }
    });

    const scrollAreaElement = scrollAreaRef.current;
    let touchMoving = false;
    let touchTimeout: ReturnType<typeof setTimeout>;

    function handleScrollAreaAddScrolling() {
      scrollAreaElement.style.setProperty('display', 'block');

      if (touchMoving) return;

      scrollAreaElement.scrollTop =
        scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight;
    }

    function handleScrollAreaRemoveScrolling() {
      if (touchMoving) return;

      scrollAreaElement.style.removeProperty('display');
    }

    function handleTouchMove() {
      touchMoving = true;
    }

    function handleTouchEnd() {
      if (touchTimeout) {
        clearTimeout(touchTimeout);
      }

      touchTimeout = setTimeout(() => {
        touchMoving = false;
        handleScrollAreaRemoveScrolling();
      }, 5000);
    }

    scrollAreaElement.addEventListener(
      'pointerenter',
      handleScrollAreaAddScrolling
    );
    scrollAreaElement.addEventListener(
      'pointerleave',
      handleScrollAreaRemoveScrolling
    );
    scrollAreaElement.addEventListener('touchmove', handleTouchMove);
    scrollAreaElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      [...(audioElm?.textTracks || [])].forEach((track) => {
        if (track.kind === 'captions') {
          track.removeEventListener('cuechange', handleCueChange);
        }
      });

      scrollAreaElement.removeEventListener(
        'pointerenter',
        handleScrollAreaAddScrolling
      );
      scrollAreaElement.removeEventListener(
        'pointerleave',
        handleScrollAreaRemoveScrolling
      );
      scrollAreaElement.removeEventListener('touchmove', handleTouchMove);
      scrollAreaElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [audioElm, handleCueChange, updateCurrentCue]);

  useEffect(() => {
    if (!transcriptJson?.url) return;

    (async () => {
      const jsonData = await fetch(
        transcriptJson.url
      ).then<IRssPodcastTranscriptJson>((resp) => resp.ok && resp.json());

      setTranscriptData(jsonData);
    })();
  }, [transcriptJson?.url]);

  const previousSpeaker = useRef(getCueSpeaker(currentCue));
  let lastSpeakerChangeIndex = 0;

  if (!transcripts) return null;

  return (
    <div ref={scrollAreaRef} className={styles.root}>
      <div className={captionsClassNames} aria-hidden>
        <span />
        {!!recentCues?.length &&
          recentCues.map((cue, index) => {
            const cueSpeaker = getCueSpeaker(cue);
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
                key={cue.id || cue.text}
              />
            );
          })}
      </div>
    </div>
  );
};

export default ClosedCaptionsFeed;
