import { View, TextInput, StyleSheet, Text } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';
import { Position } from '@rnmapbox/maps/lib/typescript/src/types/Position';
import MapboxGL from '~/services/mapbox';
import Spacer from '~/shared/components/ui/Spacer';
import { IdempotentButton } from '~/shared/components/ui/IdempotentButton';

interface Props {
  onSubmit: (pack: CreateOfflinePackProps) => void;
  progress: number;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Required'),
  styleURL: Yup.string().required('Required'),
  maxLng: Yup.number()
    .min(-180, 'Longitude must be ≥ -180')
    .max(180, 'Longitude must be ≤ 180')
    .required('Required'),
  maxLat: Yup.number()
    .min(-90, 'Latitude must be ≥ -90')
    .max(90, 'Latitude must be ≤ 90')
    .required('Required'),
  minLng: Yup.number()
    .min(-180, 'Longitude must be ≥ -180')
    .max(180, 'Longitude must be ≤ 180')
    .required('Required'),
  minLat: Yup.number()
    .min(-90, 'Latitude must be ≥ -90')
    .max(90, 'Latitude must be ≤ 90')
    .required('Required'),
}).test('bounds-order', '', (values, ctx) => {
  if (!values) return false;
  const { minLat, maxLat, minLng, maxLng } = values;

  // Check bottom-left vs top-right
  if (minLat >= maxLat || minLng >= maxLng) {
    return ctx.createError({
      path: 'minLat', // attach error to minLat field
      message: 'Bottom left must be less than top right',
    });
  }

  return true;
});

export const CreatePackForm = ({ onSubmit, progress }: Props) => {
  return (
    <Formik
      initialValues={{
        name: '',
        styleURL: MapboxGL.StyleURL.Street,
        minZoom: 16,
        maxZoom: 22,
        maxLng: 0,
        maxLat: 0,
        minLng: 0,
        minLat: 0,
      }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        const bounds: [Position, Position] = [
          [Number(values.maxLng), Number(values.maxLat)], //top right (NE)
          [Number(values.minLng), Number(values.minLat)], //bottom left (SW)
        ];
        const pack: CreateOfflinePackProps = {
          name: values.name,
          styleURL: values.styleURL,
          bounds,
          minZoom: 16,
          maxZoom: 22,
        };
        onSubmit(pack);
      }}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
        <View style={styles.container}>
          <Text style={styles.sectionHeader}>Create Your Own Pack</Text>
          <Text>Pack Name</Text>
          <TextInput
            placeholder="Name"
            style={styles.input}
            onChangeText={handleChange('name')}
            onBlur={handleBlur('name')}
            value={values.name}
          />
          {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}


          <Text>Top Right [lat, lng]</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Lat"
              style={styles.inputHalf}
              keyboardType="numbers-and-punctuation"
              onChangeText={handleChange('maxLat')}
              onBlur={handleBlur('maxLat')}
              value={String(values.maxLat)}
            />
            <TextInput
              placeholder="Lng"
              style={styles.inputHalf}
              keyboardType="numbers-and-punctuation"
              onChangeText={handleChange('maxLng')}
              onBlur={handleBlur('maxLng')}
              value={String(values.maxLng)}
            />
          </View>

          <Text>Bottom Left [lat, lng]</Text>
          <View style={styles.row}>
            <TextInput
              placeholder="Lat"
              style={styles.inputHalf}
              keyboardType="numbers-and-punctuation"
              onChangeText={handleChange('minLat')}
              onBlur={handleBlur('minLat')}
              value={String(values.minLat)}
            />
            <TextInput
              placeholder="Lng"
              style={styles.inputHalf}
              keyboardType="numbers-and-punctuation"
              onChangeText={handleChange('minLng')}
              onBlur={handleBlur('minLng')}
              value={String(values.minLng)}
            />
          </View>
          <Spacer />
          <IdempotentButton
            title="Create Pack"
            onPress={() => {
              handleSubmit();
            }}
          />
          <Spacer />
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>Progress: {progress.toFixed(2)}%</Text>
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 6,
    backgroundColor: 'white',
    borderRadius: 16,
    // subtle card shadow (iOS + Android)
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#fff'
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    //marginHorizontal: 5,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#fff'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
    //marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressText: {
    fontSize: 12,
    color: '#333',
    marginTop: 6,
  },
});
