import * as ImagePicker from 'expo-image-picker';

export async function getPickedImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    alert('Permission to access camera roll is required!');
    return { data: null, error: new Error('Permission to access camera roll is required') };
  }

  const pickerObj = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.7,
  });

  if (!pickerObj.canceled && pickerObj.assets && pickerObj.assets.length > 0) {
    const galleryUriString = pickerObj.assets[0].uri;
    const newImage = { uri: galleryUriString };
    return { data: newImage, error: null };
  }
  return { data: null, error: new Error('No images selected or picker was canceled') };
}
