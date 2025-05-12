import { Text, View, TouchableOpacity, TextInput, Modal, Image, Alert, FlatList, RefreshControl, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import plusIcon from "../../assets/icons/plus.png";
import info from "../../assets/icons/info.png"
import { getDatabase, ref, set, remove } from 'firebase/database';
//entire imports needed for Hatchify. contains necessary features from react-native and firebase actions.

const formatDate = (date) => { // date formatting
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

const rtdb = getDatabase(); 

//necessary usestates for the project.
const CreateBatch = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchDate, setBatchDate] = useState(formatDate(new Date()));
  const [numberOfEggs, setNumberOfEggs] = useState('');
  const [editBatchId, setEditBatchId] = useState(null);
  const [uid, setUid] = useState(null);
  const [batches, setBatches] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); 
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false); 
  const [remarksModalVisible, setRemarksModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null); 
  const [batchRemarks, setBatchRemarks] = useState(''); 
  const [isReadOnly, setIsReadOnly] = useState(false); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchBatches(user.uid); 
      } else {
        setUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchBatches = (userId) => {
    setLoading(true); //loading circle 
    try { //query of batches made by the user
      const batchQuery = query(collection(db, 'batches'), where('uid', '==', userId));
      const unsubscribe = onSnapshot(batchQuery, (querySnapshot) => { //realtime update listener
        const fetchedBatches = [];
        querySnapshot.forEach((doc) => {
          const batchData = doc.data();
          fetchedBatches.push({
            id: doc.id,
            ...batchData,
            batchRemarks: { //arranges remark data from the db
              day5: batchData.day5 || 'No remarks available.',
              day10: batchData.day10 || 'No remarks available.',
              day15: batchData.day15 || 'No remarks available.',
            }
          });
        });
        setBatches(fetchedBatches);
      }, (error) => {
        console.error('Error fetching batches:', error);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { //to verify user changes and batch info changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const unsubscribeFromBatches = fetchBatches(user.uid);
        return () => {
          unsubscribeFromBatches();
        };
      } else {
        setUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => { //handles refresh when the user pulls the screen down
    setRefreshing(true);
    if (uid) {
      await fetchBatches(uid);
    }
    setRefreshing(false);
  };

  const handleFormSubmit = async () => {
    if (!batchName || !batchDate || !numberOfEggs) { //ensures the fields are populated
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    try {
      // Check for ongoing batches
      const ongoingBatchesQuery = query(
        collection(db, 'batches'),
        where('uid', '==', uid),
        where('status', '==', 'ongoing')
      );
  
      const ongoingBatchesSnapshot = await getDocs(ongoingBatchesQuery);
      //user cannot create 2 ongoing batches, show an error
      if (!editBatchId && ongoingBatchesSnapshot.size > 0) {
        Alert.alert('Error', 'Only 1 ongoing batch at a time is allowed!');
        return;
      }
  
      // Fetch user email and mobilenum
      const userEmail = auth.currentUser?.email;
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        Alert.alert('Error', 'User data not found!');
        return;
      }
  
      const { mobilenum } = userDocSnap.data();
  
      if (!mobilenum) {
        Alert.alert('Error', 'Please save your mobile number first.');
        return;
      }
  
      if (editBatchId) {
        // Update functionality
        const batchRef = doc(db, 'batches', editBatchId);
  
        // Only update relevant fields, excluding `status`
        const updatedData = {
          batchName,
          startDate: batchDate,
          numberOfEggs,
          email: userEmail,
          mobilenum,
        };
  
        await updateDoc(batchRef, updatedData);
  
        // Update RTDB
        const rtdbBatchRef = ref(rtdb, `batches/${editBatchId}`);
        await set(rtdbBatchRef, {
          batchName,
          startDate: batchDate,
          mobilenum,
        });
  
        Alert.alert('Success', 'Batch updated successfully!');
      } else {
        // for adding new batch
        const batchData = {
          batchName,
          startDate: batchDate,
          numberOfEggs,
          status: 'ongoing', //ongoing status because it is a new batch
          email: userEmail,
          mobilenum,
          uid,
        };
  
        const newBatchRef = await addDoc(collection(db, 'batches'), batchData);
  
        // Add batch data to RTDB
        const rtdbBatchRef = ref(rtdb, `batches/${newBatchRef.id}`);
        await set(rtdbBatchRef, {
          batchName,
          startDate: batchDate,
          mobilenum,
        });
  
        Alert.alert('Success', 'Batch added successfully!');
      }
  
      setModalVisible(false);
      resetForm();
      fetchBatches(uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to add/update batch. Please try again.');
      console.error('Error adding/updating batch: ', error);
    }
  };  
  
  const resetForm = () => {
    setBatchName('');
    setBatchDate(formatDate(new Date()));
    setNumberOfEggs('');
    setEditBatchId(null);
  };

  const handleEdit = (batch) => {
    setBatchName(batch.batchName);
    setBatchDate(batch.startDate);
    setNumberOfEggs(batch.numberOfEggs);
    setEditBatchId(batch.id);
    setModalVisible(true);
  };

  const handleDeleteRequest = (batch) => {
    setBatchToDelete(batch);
    setDeleteModalVisible(true);
  };

    //function to confirm deletion of batches
  const handleConfirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'batches', batchToDelete.id));
      const rtdbBatchRef = ref(rtdb, `batches/${batchToDelete.id}`);
      await remove(rtdbBatchRef);
  
      Alert.alert('Success', 'Batch deleted successfully!');
      fetchBatches(uid);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete batch. Please try again.');
      console.error('Error deleting batch: ', error);
    } finally {
      setDeleteModalVisible(false);
      setBatchToDelete(null);
    }
  };

  const renderBatchItem = ({ item }) => {
    const [month, day, year] = item.startDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const currentDate = new Date();
  
    const dayDifference = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  
    return (
      <View className="bg-[#ede8d0] p-4 rounded-lg my-2 w-full relative" key={item.id}>
        <TouchableOpacity
          onPress={() => {
            setSelectedBatch(item);
            setRemarksModalVisible(true);
            setIsReadOnly(true);
          }}
          className="absolute top-2 right-2 w-10 h-10 rounded-full bg-[] flex items-center justify-center z-10"
        >
          <Image source={info} className="w-5 h-5" alt="Information Icon" />
        </TouchableOpacity>
  
        <Text className="font-pbold text-lg">Batch Name: {item.batchName}</Text>
        <Text className="font-pmedium">Start Date: {item.startDate}</Text>
  
        {item.status === 'finished' ? (
          <>
            {/* <Text className="font-pmedium">Day: Ended</Text> */}
            <Text className="font-pmedium">End Date: {item.endDate || 'N/A'}</Text>
          </>
        ) : (
          <Text className="font-pmedium">Day: {dayDifference + 1}</Text>
        )}
  
        <Text className="font-pmedium">Number of Eggs: {item.numberOfEggs}</Text>
        <Text className="font-pmedium">Status: {item.status}</Text>
  
        <View className="flex-row justify-end mt-2">
          <TouchableOpacity onPress={() => handleEdit(item)} className="mr-2 bg-yellow-500 p-2 rounded">
            <Text className="text-white">Edit</Text>
          </TouchableOpacity>
  
          <TouchableOpacity onPress={() => handleDeleteRequest(item)} className="bg-[#950606] p-2 rounded">
            <Text className="text-white">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 px-4">
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-psemibold mb-5 mt-4">Batches</Text>

        <TouchableOpacity 
          className="absolute bottom-10 right-4 z-10"
          onPress={() => setModalVisible(true)}
        >
          <Image source={plusIcon} className="w-12 h-12" resizeMode="contain" />
        </TouchableOpacity>

        
        <Modal
          animationType="bond"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white w-4/5 p-5 rounded-lg shadow-lg">
              <Text className="text-xl font-psemibold mb-5">Fill out Batch Details</Text>

              <TextInput
                className="w-full h-10 border border-gray-300 rounded-lg px-3 mb-4"
                placeholder="Batch Name (e.g. Batch A)"
                value={batchName}
                onChangeText={setBatchName}
              />

              <TextInput
                className="w-full h-10 border border-gray-300 rounded-lg px-3 mb-4"
                placeholder="Date (e.g. 09-21-2024)"
                value={batchDate}
                onChangeText={setBatchDate}
              />

              <TextInput
                className="w-full h-10 border border-gray-300 rounded-lg px-3 mb-4"
                placeholder="Number of Eggs"
                value={numberOfEggs}
                keyboardType="numeric"
                onChangeText={setNumberOfEggs}
              />

              <TouchableOpacity
                className="bg-[#e0cda9] py-2 rounded-lg mb-4"
                onPress={handleFormSubmit}
              >
                <Text className="text-[#5f432c] text-center text-base font-psemibold">Submit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-2 rounded-lg"
                onPress={() => setModalVisible(false)}
              >
                <Text className="font-psemibold text-[#5f432c] text-center text-base">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        
        <Modal
          animationType="bond"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white w-4/5 p-5 rounded-lg shadow-lg">
              <Text className="text-lg font-psemibold mb-5">Are you sure you want to delete this batch?</Text>
              <TouchableOpacity
                className="bg-red-500 py-2 rounded-lg mb-4"
                onPress={handleConfirmDelete}
              >
                <Text className="text-white text-center text-base font-psemibold">Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-2 rounded-lg"
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text className="font-psemibold text-center text-base">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={remarksModalVisible}
          transparent={true}
          animationType="bond"
          onRequestClose={() => setRemarksModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-6 rounded-lg w-3/4">
              <Text className="text-lg font-psemibold mb-4 text-center">View Remarks</Text>

              {/* Display remarks only for the selected batch */}
              {selectedBatch ? (
                <View>
                  <Text className="text-md font-psemibold mb-2">Day 5 Remarks:</Text>
                  <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                    {selectedBatch.batchRemarks?.day5 || 'No remarks available.'}
                  </Text>

                  <Text className="text-md font-psemibold mb-2">Day 10 Remarks:</Text>
                  <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                    {selectedBatch.batchRemarks?.day10 || 'No remarks available.'}
                  </Text>

                  <Text className="text-md font-psemibold mb-2">Day 15 Remarks:</Text>
                  <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                    {selectedBatch.batchRemarks?.day15 || 'No remarks available.'}
                  </Text>
                </View>
              ) : (
                <Text>No batch selected.</Text>
              )}

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  onPress={() => setRemarksModalVisible(false)}
                  className="bg-[#5f432c] py-2 px-4 rounded-lg w-1/2 mr-1"
                >
                  <Text className="text-center text-white font-psemibold">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {loading ? (
          <Text>Loading batches...</Text>
        ) : (
          <FlatList
            data={batches}
            renderItem={renderBatchItem}
            keyExtractor={(item) => item.id}
            className="w-full mt-4" 
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default CreateBatch;
