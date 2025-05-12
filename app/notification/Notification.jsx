import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, query, onSnapshot, where, getDocs, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

import warning from "../../assets/icons/warning.png";
import success from "../../assets/icons/success.png";
import info from "../../assets/icons/info.png";

const Notification = ({ visible, onClose, batches = [] }) => {
  const [notifications, setNotifications] = useState([]);
  const [markedRead, setMarkedRead] = useState({});

  useEffect(() => {
    if (batches.length === 0) return;

    const batchIds = batches.map(batch => batch.id);
    const unsubscribe = onSnapshot(
      query(collection(db, 'batchNotif'), where('batchid', 'in', batchIds)),
      (querySnapshot) => {
        const notificationsList = [];

        querySnapshot.forEach((doc) => {
          const notification = doc.data();

          if (notification.time instanceof Timestamp) {
            notificationsList.push({
              id: doc.id,
              message: notification.message,
              icon: notification.icon,
              time: notification.time.toDate(),
              markasread: notification.markasread,
            });
          } else {
            console.warn(`Notification with ID ${doc.id} is missing a valid time field:`, notification);
          }
        });

        notificationsList.sort((a, b) => b.time - a.time);

        setNotifications((prevNotifications) => {
          if (JSON.stringify(prevNotifications) !== JSON.stringify(notificationsList)) {
            return notificationsList;
          }
          return prevNotifications;
        });

        const readNotifications = {};
        notificationsList.forEach((notification) => {
          readNotifications[notification.id] = notification.markasread === 'Yes';
        });
        setMarkedRead((prevMarkedRead) => {
          if (JSON.stringify(prevMarkedRead) !== JSON.stringify(readNotifications)) {
            return readNotifications;
          }
          return prevMarkedRead;
        });
      },
      (error) => {
        console.error('Error fetching notifications in real-time:', error);
      }
    );

    return () => unsubscribe();
  }, [batches]);

  const handleMarkAsRead = async (id) => {
    const newMarkedRead = { ...markedRead, [id]: !markedRead[id] };
    setMarkedRead(newMarkedRead);
    const newStatus = newMarkedRead[id] ? 'Yes' : 'No';

    try {
      const notificationRef = doc(db, 'batchNotif', id);
      await updateDoc(notificationRef, {
        markasread: newStatus,
      });
      console.log(`Notification with ID ${id} marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const CustomCheckBox = ({ isChecked, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#5f432c',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isChecked ? '#5f432c' : 'transparent',
        marginLeft: 8,
      }}
    >
      {isChecked && <Text style={{ color: '#fffdd0', fontSize: 15 }}>✓</Text>}
    </TouchableOpacity>
  );

  const createNotification = async (batch, message, icon) => {
    const user = auth.currentUser;

    const newNotificationEntry = {
      batchid: batch.id,
      uid: user.uid,
      message: message,
      icon: icon,
      time: Timestamp.now(),
    };

    try {
      const batchNotifRef = collection(db, 'batchNotif');
      const q = query(
        batchNotifRef,
        where('batchid', '==', batch.id),
        where('message', '==', newNotificationEntry.message),
        where('icon', '==', newNotificationEntry.icon)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return;
      }

      await addDoc(batchNotifRef, newNotificationEntry);
      console.log(`Notification created for batch: ${batch.batchName}`);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const getIconUri = (iconType) => {
    const icons = {
      10: info,
      11: warning,
      12: success,
    };

    return icons[iconType] || info;
  };

  if (!visible) return null;

  return (
    <View className="absolute top-16 right-5 z-50 bg-[#e0cda9] rounded-lg p-6 shadow-lg w-80">
      <View
        style={{
          position: 'absolute',
          top: -10,
          right: 15,
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderRightWidth: 10,
          borderBottomWidth: 10,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#e0cda9',
        }}
      />
      <Text className="font-psemibold text-xl mb-4">Notifications</Text>
      <ScrollView style={{ maxHeight: 300 }}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleMarkAsRead(item.id)}
              className="flex-row items-center mb-4 p-3 -mt-1 bg-[#ffffe0] rounded-md"
            >
              <Image source={getIconUri(item.icon)} className="w-5 h-5 mr-3" resizeMode="contain" />
              <Text className="font-pmedium flex-1 text-base text-md">{item.message}</Text>
              <CustomCheckBox
                isChecked={markedRead[item.id] || false}
                onPress={() => handleMarkAsRead(item.id)}
              />
            </TouchableOpacity>
          )}
        />
      </ScrollView>
      <TouchableOpacity onPress={onClose} className="bg-[#5f432c] py-2 rounded mt-4">
        <Text className="text-white text-center font-psemibold">Close</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Notification;
