import type { IAudioData, IRssItem } from '@interfaces/data';
import convertStringToInteger from '@lib/convert/string/convertStringToInteger';

const parseAudioData = ({
  guid,
  link,
  title,
  itunes,
  enclosure,
  categories
}: IRssItem): IAudioData => ({
  guid,
  link,
  ...(enclosure && { url: enclosure.url }),
  ...(categories && {
    categories: categories.map((v) => v.replace(/^\s+|\s+$/g, ''))
  }),
  title,
  ...(itunes && {
    ...(itunes.subtitle && { subtitle: itunes.subtitle }),
    ...(itunes.image && { imageUrl: itunes.image }),
    ...(itunes.duration && { duration: itunes.duration }),
    ...(itunes.season && { season: convertStringToInteger(itunes.season) })
  })
});

export default parseAudioData;
