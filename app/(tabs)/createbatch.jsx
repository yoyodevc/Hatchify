import { Text, View, TouchableOpacity, TextInput, Modal, Image, Alert, FlatList, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import plusIcon from "../../assets/icons/plus.png";

const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

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
    setLoading(true);
    try {
      const batchQuery = query(collection(db, 'batches'), where('uid', '==', userId));
      const unsubscribe = onSnapshot(batchQuery, (querySnapshot) => {
        const fetchedBatches = [];
        querySnapshot.forEach((doc) => {
          fetchedBatches.push({ id: doc.id, ...doc.data() });
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
  
  useEffect(() => {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    if (uid) {
      await fetchBatches(uid);
    }
    setRefreshing(false);
  };

  const handleFormSubmit = async () => {
    if (!batchName || !batchDate || !numberOfEggs) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    // Check for existing ongoing batches
    const ongoingBatchesQuery = query(
      collection(db, 'batches'),
      where('uid', '==', uid),
      where('status', '==', 'ongoing')
    );
    
    const ongoingBatchesSnapshot = await getDocs(ongoingBatchesQuery);
    
    if (!editBatchId && ongoingBatchesSnapshot.size > 0) {
      Alert.alert('Error', 'Only 1 ongoing batch at a time is allowed!');
      return;
    }
  
    try {
      if (editBatchId) {
        const batchRef = doc(db, 'batches', editBatchId);
        await updateDoc(batchRef, {
          batchName,
          startDate: batchDate,
          numberOfEggs,
        });
        Alert.alert('Success', 'Batch updated successfully!');
      } else {
        await addDoc(collection(db, 'batches'), {
          batchName,
          startDate: batchDate,
          numberOfEggs,
          status: 'ongoing',
          uid,
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

  const handleConfirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'batches', batchToDelete.id));
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
      <View className="bg-[#ede8d0] p-4 rounded-lg my-2 w-full">
        <Text className="font-pbold">Batch Name: {item.batchName}</Text>
        <Text className="font-pmedium">Start Date: {item.startDate}</Text>
        <Text className="font-pmedium">Day: {dayDifference + 1}</Text>
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
          className="absolute bottom-8 right-8 z-10"
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
          animationType="fade"
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
