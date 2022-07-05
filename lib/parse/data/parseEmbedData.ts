import type { IAudioData, IEmbedData, IRssItem } from '@interfaces/data';
import type { IEmbedConfig } from '@interfaces/embed/IEmbedConfig';
import type Parser from 'rss-parser';
import generateAudioUrl from '@lib/generate/string/generateAudioUrl';
import parseAudioData from './parseAudioData';

const parseEmbedData = (
  config: IEmbedConfig,
  rssData?: Parser.Output<Parser.Item>
): IEmbedData => {
  const {
    feedUrl,
    subscribeUrl,
    imageUrl: configBgImageUrl,
    title: configTitle,
    subtitle: configSubtitle,
    audioUrl: configAudioUrl,
    epImageUrl: configImageUrl,
    episodeGuid: configEpisodeGuid,
    showPlaylist,
    playlistSeason,
    playlistCategory
  } = config;
  const {
    title: rssTitle,
    link: rssShareUrl,
    image: rssImage,
    itunes,
    items: rssItems
  } = rssData || {};
  const { url: rssImageUrl } = rssImage || {};
  const { image: rssItunesImage, owner: rssItunesOwner } = itunes || {};
  const audioItems =
    rssItems &&
    rssItems.map((i) => ({
      link: rssShareUrl,
      ...parseAudioData(i as IRssItem),
      // Use feed title as audio items' subtitle.
      subtitle: rssTitle
    }));
  const audio: IAudioData = {
    // Establish defaults from feed props.
    ...((rssImageUrl || rssItunesImage) && {
      imageUrl: rssImageUrl || rssItunesImage
    }),

    // Override with feed items props.
    ...(audioItems && {
      // Default to first audio item.
      ...audioItems[0],
      // Override with configured guid audio from feed if it exists.
      ...(configEpisodeGuid &&
        (audioItems.filter((i) => i.guid === configEpisodeGuid).pop() || {}))
    }),

    // Override with values from config.
    ...(configTitle && { title: configTitle }),
    ...(configSubtitle && { subtitle: configSubtitle }),
    ...(configAudioUrl && { url: generateAudioUrl(configAudioUrl) }),
    ...(configImageUrl && { imageUrl: configImageUrl })
  };
  const audioHasProps = Object.keys(audio).length > 0;
  const playlist =
    !!showPlaylist &&
    [
      // Filter audio by season.
      (items: IAudioData[]) =>
        !playlistSeason
          ? items
          : items.filter((i) => i.season === playlistSeason),
      // Filter audio by category.
      (items: IAudioData[]) =>
        !playlistCategory
          ? items
          : items.filter(
              (i) =>
                !!i.categories && i.categories.indexOf(playlistCategory) > -1
            ),
      // Cap number of items to configured length.
      (items: IAudioData[]) =>
        showPlaylist === 'all' ? items : items.slice(0, showPlaylist)
    ].reduce((a, f) => f(a), audioItems);
  const bgImageUrl =
    configBgImageUrl || rssImageUrl || rssItunesImage || audio.imageUrl;
  const data: IEmbedData = {
    ...(bgImageUrl && { bgImageUrl }),
    ...(audioHasProps && { audio }),
    ...(playlist?.length && { playlist }),
    ...(feedUrl && {
      rssTitle,
      shareUrl: showPlaylist ? rssShareUrl : audio.link,
      ...(rssItunesOwner && { owner: rssItunesOwner })
    }),
    followUrls: {
      ...((subscribeUrl || feedUrl) && { rss: subscribeUrl || feedUrl })
    }
  };

  return data;
};

export default parseEmbedData;
