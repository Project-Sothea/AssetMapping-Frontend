import { zodResolver } from '@hookform/resolvers/zod';
import type { Position } from 'geojson';
import { useForm, type Resolver } from 'react-hook-form';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';
import MapboxGL from '~/services/mapbox';
import { IdempotentButton } from '~/shared/components/ui/IdempotentButton';

interface Props {
  onSubmit: (pack: CreateOfflinePackProps) => void;
  progress: number;
}

const packSchema = z
  .object({
    name: z.string().trim().min(1, 'Required'),
    styleURL: z.string().trim().min(1, 'Required'),
    maxLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
    minLng: z.number().min(-180).max(180),
    minLat: z.number().min(-90).max(90),
  })
  .refine((val) => val.minLat < val.maxLat && val.minLng < val.maxLng, {
    path: ['minLat'],
    message: 'Bottom left must be less than top right',
  });

type PackFormValues = z.infer<typeof packSchema>;

export const CreatePackForm = ({ onSubmit, progress }: Props) => {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PackFormValues>({
    defaultValues: {
      name: '',
      styleURL: MapboxGL.StyleURL.Street,
      maxLng: 0,
      maxLat: 0,
      minLng: 0,
      minLat: 0,
    },
    resolver: zodResolver(packSchema) as Resolver<PackFormValues>,
    mode: 'onBlur',
  });

  const values = watch();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Create Your Own Pack</Text>
      <Text>Pack Name</Text>
      <TextInput
        placeholder="Name"
        style={styles.input}
        onChangeText={(text) => setValue('name', text, { shouldDirty: true, shouldValidate: true })}
        value={values?.name ?? ''}
      />
      {errors.name?.message && <Text style={styles.error}>{errors.name.message}</Text>}

      <Text>Top Right [lat, lng]</Text>
      <View style={styles.row}>
        <TextInput
          placeholder="Lat"
          style={styles.inputHalf}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const val = text === '' ? 0 : Number(text);
            setValue('maxLat', val, { shouldDirty: true, shouldValidate: true });
          }}
          value={String(values?.maxLat ?? '')}
        />
        <TextInput
          placeholder="Lng"
          style={styles.inputHalf}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const val = text === '' ? 0 : Number(text);
            setValue('maxLng', val, { shouldDirty: true, shouldValidate: true });
          }}
          value={String(values?.maxLng ?? '')}
        />
      </View>

      <Text>Bottom Left [lat, lng]</Text>
      <View style={styles.row}>
        <TextInput
          placeholder="Lat"
          style={styles.inputHalf}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const val = text === '' ? 0 : Number(text);
            setValue('minLat', val, { shouldDirty: true, shouldValidate: true });
          }}
          value={String(values?.minLat ?? '')}
        />
        <TextInput
          placeholder="Lng"
          style={styles.inputHalf}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const val = text === '' ? 0 : Number(text);
            setValue('minLng', val, { shouldDirty: true, shouldValidate: true });
          }}
          value={String(values?.minLng ?? '')}
        />
      </View>
      {errors.minLat?.message && <Text style={styles.error}>{errors.minLat.message}</Text>}

      <IdempotentButton
        title="Create Pack"
        onPress={handleSubmit((values) => {
          const bounds: [Position, Position] = [
            [Number(values.maxLng), Number(values.maxLat)],
            [Number(values.minLng), Number(values.minLat)],
          ];
          const pack: CreateOfflinePackProps = {
            name: values.name,
            styleURL: values.styleURL,
            bounds,
            minZoom: 16,
            maxZoom: 22,
          };
          onSubmit(pack);
        })}
        style={styles.createButton}
      />
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>Progress: {progress.toFixed(2)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    gap: 6,
    backgroundColor: 'transparent',
    borderRadius: 0,
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
    backgroundColor: '#fff',
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    //marginHorizontal: 5,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#fff',
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
  createButton: {
    marginTop: 8,
    marginBottom: 8,
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
