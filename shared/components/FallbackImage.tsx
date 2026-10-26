import React, { useEffect, useState } from 'react';
import { Image, type ImageProps, type ImageStyle, type StyleProp, View } from 'react-native';

import { loadCachedImage } from '~/services/images/ImageManager';

type Props = Omit<ImageProps, 'source'> & {
  filename: string;
  pinId: string;
  style?: StyleProp<ImageStyle>;
};
export const FallbackImage = React.memo(function FallbackImage({
  filename,
  pinId,
  style,
  onError,
  ...props
}: Props) {
  const key = JSON.stringify([pinId, filename]);
  const [state, setState] = useState<{ key: string; uri: string | null }>({ key, uri: null });
  const [failedLocalKey, setFailedLocalKey] = useState<string | null>(null);
  const forceRemote = failedLocalKey === key;
  useEffect(() => {
    let active = true;
    setState({ key, uri: null });
    loadCachedImage(pinId, filename, forceRemote)
      .then((uri) => {
        if (active) setState({ key, uri });
      })
      .catch(() => {
        if (active) setState({ key, uri: null });
      });
    // Cancel immediately, even if URL/download resolution is still pending.
    return () => {
      active = false;
    };
  }, [filename, pinId, key, forceRemote]);
  const uri = state.key === key ? state.uri : null;
  if (!uri) return <View style={[style, { backgroundColor: '#e0e0e0' }]} />;
  return (
    <Image
      {...props}
      source={{ uri, cache: 'force-cache' }}
      style={style}
      onError={(error) => {
        if (!forceRemote && uri.startsWith('file:')) setFailedLocalKey(key);
        else setState({ key, uri: null });
        onError?.(error);
      }}
    />
  );
});
