import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert } from 'react-native';
import { useState } from 'react';
import { PinFormValues } from './PinForm';
import { useInsertPin, useFetchActivePins, useFetchLivePins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { v4 as uuidv4 } from 'uuid';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { RePin } from '~/utils/globalTypes';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
import * as ImageManager from '~/services/ImageManager';
import { callPin } from '~/apis';
import { db } from '~/services/drizzleDb';
import { pins } from '~/db/schema';
import { sql } from 'drizzle-orm';
const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

export default function Map() {
  const { data: livePins } = useFetchLivePins();
  const { data: pins = [], isLoading, isFetching } = useFetchActivePins();

  const [selectedPin, setSelectedPin] = useState<RePin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // console.log('isFetching:', isFetching);
  // console.log(livePins ? 'livePins exist' : 'livePins d.n.e');
  const pointCollection = convertPinsToPointCollection(pins);
  const insertPin = useInsertPin();
  const screenIsFocused = useIsFocused();

  const handleDropPin = async (e: any) => {
    const [lng, lat] = (e.geometry as GeoJSON.Point).coordinates;

    if (lng && lat) {
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handlePinSubmit = async (PinformData: PinFormValues) => {
    if (droppedCoords == null) return;

    console.log('creating new pin in db...');
    try {
      const pinId = uuidv4();
      //save images to local storage and get the localUri
      const saved = await ImageManager.saveGalleryImagesLocally(pinId, PinformData.images);
      const localUris = saved.map((img) => img.localUri);

      // create new pin row in local db
      const localPin = {
        ...PinformData,
        id: pinId,
        lng: droppedCoords[0],
        lat: droppedCoords[1],
        localImages: localUris.length > 0 ? JSON.stringify(localUris) : null,
        images: null,
        status: 'dirty',
      };

      await callPin.insertLocal(localPin);

      // push to remote
      const { success } = await ImageManager.uploadAndGetRemoteImageURIs(pinId, localUris);

      //insert into supabase and update the local version
      const remotePin = {
        ...PinformData,
        images: success,
        id: pinId,
        lng: droppedCoords[0],
        lat: droppedCoords[1],
      };
      insertPin.mutate(remotePin); //TODO: modify the local pin, update sync fields

      await callPin.markPublicURIs(success, pinId);
      await callPin.markSynced(pinId);
      Alert.alert(`${remotePin.name} Created!`);

      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    }
  };

  const handleOpenPin = async (e: any) => {
    const pressedFeature = e.features?.[0];
    if (pressedFeature) {
      const pinProps = pressedFeature.properties;
      setDetailsVisible(true);
      setSelectedPin(pinProps);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={MAP_STYLE_URL}
        compassEnabled
        scaleBarEnabled
        onLongPress={handleDropPin}>
        <Camera followUserLocation followZoomLevel={16} />
        <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />

        {!isLoading && (
          <ShapeSource id="houses" shape={pointCollection} onPress={handleOpenPin}>
            <SymbolLayer
              id="homes-icons"
              style={{
                iconImage: 'pin',
                iconSize: 0.05,
              }}
            />
            <Images images={{ pin }} />
          </ShapeSource>
        )}
      </MapView>

      {selectedPin && screenIsFocused && (
        <PinDetailsModal
          visible={detailsVisible}
          pin={selectedPin}
          onClose={() => {
            setSelectedPin(null);
            setDetailsVisible(false);
            console.log('closed pin');
          }}
        />
      )}

      <PinFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setDroppedCoords(null);
        }}
        onSubmit={handlePinSubmit}
      />
    </View>
  );
}
