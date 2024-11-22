import { Text, View, Image, FlatList, TouchableOpacity, Modal, Alert, RefreshControl, TextInput, Dimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebaseConfig'; 
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth'; 

import avatar1 from '../../assets/images/avatar1.jpg';
import avatar2 from '../../assets/images/avatar2.jpg';
import avatar3 from '../../assets/images/avatar3.jpg';
import logout from '../../assets/icons/logout.png';

const { width } = Dimensions.get('window');
const scaleFontSize = (size) => (width / 375) * size;

const Profile = () => {
  const navigation = useNavigation(); 
  const [userData, setUserData] = useState({ username: '', email: '', mobile: '' }); 
  const [modalVisible, setModalVisible] = useState(false); 
  const [profileImage, setProfileImage] = useState(avatar1); 
  const [batches, setBatches] = useState([]); 
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [editedMobile, setEditedMobile] = useState('');
  const db = getFirestore(); 

  useEffect(() => {
    fetchUserData();
    fetchBatches();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser; 
      if (user) {
        const userDocRef = doc(db, 'users', user.uid); 
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({ username: data.username, email: user.email, mobile: data.mobilenum || '' });
          if (data.avatar) {
            setProfileImage(data.avatar);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchBatches = () => {
    const user = auth.currentUser;
    if (user) {
      const batchesRef = collection(db, 'batches');
      const q = query(batchesRef, where('status', '==', 'finished'));
  
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const batches = [];
        querySnapshot.forEach((doc) => {
          batches.push({ id: doc.id, ...doc.data() });
        });
        setBatches(batches);
      }, (error) => {
        console.error('Error fetching batches:', error);
      });
  
      return () => unsubscribe();
    }
  };

  const saveMobileNumber = async () => {
    if (!editedMobile.trim()) return; // Ensure mobile number is not empty
    
    Alert.alert(
      'Update Mobile Number',
      'Are you sure you want to update your mobile number?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, { mobilenum: editedMobile });
                setUserData({ ...userData, mobilenum: editedMobile });
                setIsEditingMobile(false); // Exit edit mode
              }
            } catch (error) {
              console.error('Error updating mobile number:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
          await signOut(auth);
          await AsyncStorage.removeItem('userSession');
          navigation.navigate('(auth)');
        }},
      ],
      { cancelable: false }
    );
  };

  const chooseAvatar = async (selectedAvatar) => {
    setProfileImage(selectedAvatar);
    setModalVisible(false);

    try {
      const user = auth.currentUser; 
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { avatar: selectedAvatar });
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchUserData();
    fetchBatches();
    setIsRefreshing(false);
  };

  const renderHeader = () => (
    <View className="relative items-start justify-start mt-14 mx-4">
      <View className="flex-row items-center">
        <Image source={profileImage} className="w-32 h-32 rounded-full mr-5" />
        <View>
          <Text className="text-lg font-pbold">{userData.username}</Text>
          <Text 
            className="text-sm text-gray-600 mt-1" 
            numberOfLines={1} 
            ellipsizeMode="tail" 
            style={{ maxWidth: '90%', fontSize: scaleFontSize(14) }}>
            {userData.email}
          </Text>
          
          <View className="flex-row items-center mt-2">
            {isEditingMobile ? (
              <TextInput
                value={editedMobile}
                onChangeText={setEditedMobile}
                keyboardType="phone-pad"
                className="text-sm text-gray-600 mr-2 w-24" 
                placeholder="Enter mobile number"
              />
            ) : (
              <Text className="text-sm text-gray-600 mr-2">{userData.mobile || 'No mobile number'}</Text>
            )}
            
            <TouchableOpacity onPress={() => {
              if (isEditingMobile) {
                saveMobileNumber(); 
              } else {
                setEditedMobile(userData.mobile || ''); 
                setIsEditingMobile(true);
              }
            }}>
              <Text className="text-blue-600 font-bold text-sm">{isEditingMobile ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        className="p-2"
        onPress={handleLogout}
        style={{ position: 'absolute', top: 16, right: 16 }}
      >
        <Image source={logout} className="w-6 h-6" />
      </TouchableOpacity>
    </View>
  );

  const renderAvatarModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent={true}>
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg max-w-md mx-4 shadow-lg">
          <Text className="text-lg font-psemibold mb-4">Choose Your Avatar</Text>
          <View className="flex-row justify-center flex-wrap">
            {[avatar1, avatar2, avatar3].map((avatar, index) => (
              <TouchableOpacity key={index} onPress={() => chooseAvatar(avatar)}>
                <Image source={avatar} className="w-24 h-24 rounded-full m-2" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity className="mt-4 bg-[#5f432c] rounded-md p-2" onPress={() => setModalVisible(false)}>
            <Text className="text-white text-center font-psemibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBatchItem = ({ item }) => (
    <View className="bg-gray-100 p-4 rounded-lg mb-4 shadow-sm"> 
      <Text className="text-lg font-pbold">Tray Name: {item.batchName}</Text>
      <Text className="font-pmedium">Start Date: {item.startDate}</Text>
      <Text className="font-pmedium">End Date: {item.endDate}</Text>
      <Text className="font-pmedium">Number of Eggs: {item.numberOfEggs}</Text>
      <Text className="font-pmedium">Successful Hatches: {item.hatches}</Text>
      <Text className="font-pmedium">Status: {item.status}</Text>
    </View>
  );

  return (
    <FlatList
      className="flex-1 bg-white p-4"
      data={batches}
      keyExtractor={(item) => item.id}
      renderItem={renderBatchItem}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          {renderHeader()}
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            className="mt-4 ml-10"
          >
            <Text className="text-blue-600 font-psemibold underline">Change Avatar</Text>
          </TouchableOpacity>
          {renderAvatarModal()}
          <View className="mt-9">
            <Text className="text-lg font-psemibold mb-4">Your Finished Batches</Text>
          </View>
        </>
      }
    />
  );
};

export default Profile;
