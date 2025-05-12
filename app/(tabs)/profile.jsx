import { Text, View, Image, FlatList, TouchableOpacity, Modal, Alert, RefreshControl, TextInput, Dimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../firebaseConfig'; 
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth'; 
//necessary imports for the profile page, this includes features from react-native and firebase actions.

//below are the image imports for the avatars and logout button, as well as the info icon to view remarks.
import avatar1 from '../../assets/images/avatar1.jpg';
import avatar2 from '../../assets/images/avatar2.jpg';
import avatar3 from '../../assets/images/avatar3.jpg';
import logout from '../../assets/icons/logout.png';
import info from "../../assets/icons/info.png"

//to get the width of the user's mobile phone
const { width } = Dimensions.get('window');
const scaleFontSize = (size) => (width / 375) * size;

//states needed for the profile page
const Profile = () => {
  const navigation = useNavigation(); 
  const [userData, setUserData] = useState({ username: '', email: '', mobile: '' }); 
  const [modalVisible, setModalVisible] = useState(false); 
  const [profileImage, setProfileImage] = useState(avatar1); 
  const [batches, setBatches] = useState([]); 
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [editedMobile, setEditedMobile] = useState('');
  const [batchRemarks, setBatchRemarks] = useState(null);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false); 
  const [isReadOnly, setIsReadOnly] = useState(false); 
  const [emailWidth, setEmailWidth] = useState(0);
  const db = getFirestore(); 

  useEffect(() => {
    fetchUserData();
    fetchBatches();
  }, []);

  // function that retrieves user data from firestore
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

  // function that retrieves finished batch from firestore
  const fetchBatches = () => {
    const user = auth.currentUser;
    if (user) {
      const batchesRef = collection(db, 'batches');
      
      const q = query(
        batchesRef,
        where('status', '==', 'finished'),
        where('uid', '==', user.uid)
      );
  
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const batches = [];
        querySnapshot.forEach((doc) => {
          const batchData = doc.data();
          
          const remarks = {
            day5: batchData.day5 || 'No remarks available.', 
            day10: batchData.day10 || 'No remarks available.',
            day15: batchData.day15 || 'No remarks available.',
          };
  
          batches.push({ 
            id: doc.id, 
            ...batchData, 
            remarks: remarks
          });
        });
        setBatches(batches);
      }, (error) => {
        console.error('Error fetching batches:', error);
      });
  
      return () => unsubscribe();
    }
  };

  const handleBatchSelection = (selectedBatch) => {
    setBatchRemarks(selectedBatch.remarks); 
    setRemarksModalVisible(true); 
  };
  //function for saving user's number
  const saveMobileNumber = async () => {
    if (!editedMobile.trim()) return; //return if the input is empty.
    
    Alert.alert( //task confirmation before proceeding
      'Update Mobile Number',
      'Are you sure you want to update your mobile number?',
      [
        { text: 'Cancel', style: 'cancel' }, //cancel
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) { //update the mobile number in firebase
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, { mobilenum: editedMobile });
                setUserData({ ...userData, mobilenum: editedMobile });
                setIsEditingMobile(false); 
              }
            } catch (error) {
              console.error('Error updating mobile number:', error);
            }
          },
        },
      ],
      { cancelable: true } //cancel if the user taps outside of the .alert
    );
  };

  //for responsiveness
  //gets the width of the email text field
  const handleEmailLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    console.log('Email Width:', width); 
    //saves the width in state
    setEmailWidth(width);
  };
  
  

  const handleLogout = async () => {
    Alert.alert( //task confirmation before logging out 
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
          await signOut(auth); //logout
          await AsyncStorage.removeItem('userSession'); //clears data from the session
          navigation.navigate('(auth)'); //redirect to login screen
        }},
      ],
      { cancelable: false } //prevents cancel if tapping outside of alert
    );
  };

  //function to save chosen avatar to firestore
  const chooseAvatar = async (selectedAvatar) => {
    setProfileImage(selectedAvatar);
    setModalVisible(false);

    try {
      const user = auth.currentUser; 
      if (user) { //saves the user avatar to db
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
          
          <View onLayout={handleEmailLayout}>
          <Text
            className="text-sm text-gray-600 mt-1"
            style={{
              width: 200,  // Set a fixed width for testing truncation
              fontSize: scaleFontSize(14),
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userData.email}
          </Text>
          </View>

          
          <View className="flex-row items-center mt-2">
            {isEditingMobile ? (
              <TextInput
                value={editedMobile}
                onChangeText={setEditedMobile}
                keyboardType="phone-pad"
                className="text-sm text-gray-600 mr-2 w-20" 
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
  <View className="bg-[#ede8d0] p-4 rounded-lg mb-4 shadow-sm"> 
    <TouchableOpacity
      onPress={() => handleBatchSelection(item)} // Pass the selected batch to the modal
      className="absolute top-2 right-2 w-10 h-10 rounded-full bg-[] flex items-center justify-center z-10"
    >
      <Image source={info} className="w-5 h-5" alt="Information Icon" />
    </TouchableOpacity>

    <Text className="text-lg font-pbold">Tray Name: {item.batchName}</Text>
    <Text className="font-pmedium">Start Date: {item.startDate}</Text>
    <Text className="font-pmedium">End Date: {item.endDate}</Text>
    <Text className="font-pmedium">Number of Eggs: {item.numberOfEggs}</Text>
    <Text className="font-pmedium">Successful Hatches: {item.hatches}</Text>
    <Text className="font-pmedium">Status: {item.status}</Text>
  </View>
);

  return (
    <>
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
            className="mt-4 ml-8"
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

      <Modal
        visible={remarksModalVisible}
        transparent={true}
        animationType="bond"
        onRequestClose={() => setRemarksModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-lg w-3/4">
            <Text className="text-lg font-psemibold mb-4 text-center">View Remarks</Text>
            <Text className="text-md font-psemibold mb-2">Day 5 Remarks:</Text>
            <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
              {batchRemarks?.day5 || 'No remarks available.'}
            </Text>
            <Text className="text-md font-psemibold mb-2">Day 10 Remarks:</Text>
            <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
              {batchRemarks?.day10 || 'No remarks available.'}
            </Text>
            <Text className="text-md font-psemibold mb-2">Day 15 Remarks:</Text>
            <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
              {batchRemarks?.day15 || 'No remarks available.'}
            </Text>
            <TouchableOpacity
              onPress={() => setRemarksModalVisible(false)}
              className="bg-[#5f432c] py-2 px-4 rounded-lg mt-4"
            >
              <Text className="text-white text-center font-psemibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

  </>
  );

};

export default Profile;
