// Mobile app -> WMS backend base URL.
//
// Android emulator: 10.0.2.2 is the host machine's localhost, so the backend
// running on your PC at port 5000 is reachable there.
// Physical device: replace 10.0.2.2 with your computer's LAN IP, e.g.
//   http://192.168.1.25:5000/api
// and make sure the phone and PC are on the same Wi-Fi network.

import { Platform } from 'react-native';

export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

export default API_BASE_URL;
