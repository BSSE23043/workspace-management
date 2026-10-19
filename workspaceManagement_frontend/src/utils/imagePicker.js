import { Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

// Opens the phone's photo gallery and lets the user pick a SINGLE picture
// (no videos). Once a photo is chosen we hand its local file URI back through
// onPicked so the caller can save it as the profile picture (DP). The <Image>
// that renders it scales the photo to fit the circular DP frame automatically.
export const pickProfilePictureFromGallery = (onPicked) => {
  launchImageLibrary(
    {
      mediaType: 'photo', // photos only, never video
      selectionLimit: 1, // one picture at a time
    },
    (response) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(
          'Gallery Unavailable',
          response.errorMessage || 'Could not open the photo gallery.'
        );
        return;
      }
      const asset = response.assets && response.assets[0];
      if (asset && asset.uri && onPicked) {
        onPicked(asset.uri);
      }
    }
  );
};

export default pickProfilePictureFromGallery;
