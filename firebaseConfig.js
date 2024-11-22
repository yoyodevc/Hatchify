import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';  

const firebaseConfig = {
  apiKey: 'AIzaSyAXTIst9hiKGSA7Bk_Hb5lQBZ8WW_vHgzw',
  authDomain: 'hatchifyapp.firebaseapp.com',
  databaseURL: 'https://hatchifyapp-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: 'hatchifyapp',
  storageBucket: 'hatchifyapp.appspot.com',
  messagingSenderId: '985238711376',
  appId: '1:985238711376:android:c9b33958645e4aa2fcb555',
  measurementId: 'G-9736581925',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

//rtdb
export const realtimeDb = getDatabase(app);
