import { FlatList, Text, View, Image, TouchableOpacity, Modal, BackHandler, Alert, ActivityIndicator, TextInput } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue, set, off, remove } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import warning from "../../assets/icons/warning.png";
import success from "../../assets/icons/success.png";
import info from "../../assets/icons/info.png";
import notificationIcon from '../../assets/icons/notification.png';
import Notification from '../notification/Notification';
import axios from 'axios';
//necessary imports for the hatchify app. contains features from react-native and firebase.

const Home = () => { // staes for the homepage
  const [username, setUsername] = useState('');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchStatuses, setBatchStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  //states for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [remarksModalVisible, setRemarksModalVisible] = useState(false); 
  const [hatchedEggs, setHatchedEggs] = useState(''); 
  const [batchRemarks, setBatchRemarks] = useState(''); 
  const [successRateModalVisible, setSuccessRateModalVisible] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false); 
  //states for notification
  const [shouldCreateNotification, setShouldCreateNotification] = useState(false);
  const [notificationBatch, setNotificationBatch] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [existingNotifications, setExistingNotifications] = useState(new Set());

  const db = getFirestore();
  const rtdb = getDatabase();
    
  const fetchUserData = async () => {
    setLoading(true); //loading circle
    const user = auth.currentUser; //check for logged user

    if (user) {
        try { //"tries" retrieve user information from db
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) { //sets the username in html to the logged user's username
                const userData = userDoc.data();
                setUsername(userData.username);
                //retrieve batches related to the userid
                const batchQuery = query(
                    collection(db, 'batches'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'ongoing')
                );

                //for realtime changes on user's batch info
                const unsubscribe = onSnapshot(batchQuery, (querySnapshot) => {
                    const fetchedBatches = [];
                    querySnapshot.forEach((doc) => {
                        const batchData = doc.data();
                        const batchRemarks = {
                            day5: batchData.day5 || 'No remarks available.',
                            day10: batchData.day10 || 'No remarks available.',
                            day15: batchData.day15 || 'No remarks available.'
                        };
                        //to save batch info with remarks
                        fetchedBatches.push({ id: doc.id, batchRemarks, ...batchData });
                    });
                    setBatches(fetchedBatches);
                }, (error) => {
                    console.error("Error fetching batches:", error);
                });
                return unsubscribe;
            } else {
                console.log("No user document found");
            }
        } catch (error) {
            console.error('Error fetching user document:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    } else {
        // If user is not logged in, stop refreshing
        //console.log("No authenticated user");
        setRefreshing(false);
    }
};

  // function para icheck yung mga batches na may day 1 notification in-app, etc
  useEffect(() => {
    batches.forEach((item) => {
        //gets the date
        const [month, day, year] = item.startDate.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const currentDate = new Date();

        // count the elapsed days
        const dayDifference = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        const displayDay = dayDifference + 1;

        // unique if for notifications
        const notificationId = `${item.id}-day-${displayDay}`;

        // dupolicate checking, and creation of notification messages
        if (!existingNotifications.has(notificationId)) {
            if (displayDay === 1) {
                createNotification(item, `The batch ${item.batchName} has started incubation.`, success);
            } else if ([5, 10, 15].includes(displayDay)) {
                createNotification(item, `The batch ${item.batchName}'s incubation is now at Day ${displayDay} and needs to be candled.`, info);
            } else if (displayDay === 18) {
                createNotification(item, `The batch ${item.batchName} has entered lockdown mode. Raise the Humidity to 60% - 65%.`, warning);
            } else if (displayDay === 21) {
                createNotification(item, `The batch ${item.batchName} is expected to finish incubating today.`, info);
            }
            //marker para malaman na nag set na yung notification, para sa duplicates
            setExistingNotifications((prev) => new Set(prev).add(notificationId));
        }
    });
}, [batches]);

// create notification use effect
useEffect(() => {
    if (shouldCreateNotification && notificationBatch) {
        createNotification(notificationBatch);
        setShouldCreateNotification(false);
        setNotificationBatch(null);
    }
}, [shouldCreateNotification, notificationBatch]);

const fetchTemperatureAndHumidity = () => {
  //retrieve teperature and humidity from Firebase RTDB
  const tempRef = ref(rtdb, 'temperature');
  const humidityRef = ref(rtdb, 'humidity');

  const fetchData = () => {
    //listens for realtime changes using snapshopt method from firebase
    onValue(tempRef, (snapshot) => {
      const tempValue = snapshot.val();
      //console.log('Temperature:', tempValue);
      setTemperature(tempValue); //sets the latest temperature
    }, (error) => {
      console.error('Error fetching temperature:', error);
    });

    onValue(humidityRef, (snapshot) => {
      //listens for realtime changes using snapshot method from firebase
      const humidityValue = snapshot.val();
      //console.log('Humidity:', humidityValue);
      const formattedHumidity = `${parseFloat(humidityValue).toFixed(1)}%`;
      setHumidity(formattedHumidity); //sets the latest temperature
    }, (error) => {
      console.error('Error fetching humidity:', error);
    });
  };

  const stopFetching = () => {
    off(tempRef);
    off(humidityRef);
    //console.log('RTDB retrieval off');
  };

  return { fetchData, stopFetching };
};

const { fetchData, stopFetching } = fetchTemperatureAndHumidity();

useEffect(() => {
  if (notificationsVisible) {
    stopFetching();
  } else {
    fetchData();
  }
  return () => {
    stopFetching();
  };
}, [notificationsVisible]);

  // auto-refresh every hour.
  useEffect(() => {
    fetchUserData();
    fetchTemperatureAndHumidity();
    
    const timeoutId = setTimeout(() => {
      fetchUserData();
    }, 3000);

    const now = new Date();
    const minutesUntilNextHour = 60 - now.getMinutes();
    const millisecondsUntilNextHour = minutesUntilNextHour * 60 * 1000;
  
    const startAtNextHour = setTimeout(() => {
      fetchUserData();
  
      const intervalId = setInterval(() => {
        fetchUserData();
      }, 3600000);
  
      return () => clearInterval(intervalId);
    }, millisecondsUntilNextHour);
  
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(startAtNextHour);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  //sensor data to firestore
  const writeSensorDataToFirestore = async (temperature, humidity) => {
    try {
      const sensorDataRef = doc(db, 'sensor', 'sensordata');
      await setDoc(sensorDataRef, {
        temperature: temperature,
        humidity: humidity,
        timestamp: Timestamp.now()
      }, { merge: true });
      console.log('Sensor data written to Firestore');
    } catch (error) {
      console.error('Error writing sensor data to Firestore:', error);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (temperature !== 0 && humidity !== 0) {
        writeSensorDataToFirestore(temperature, humidity);
      }
    }, 300000); //5 minutes
    return () => clearInterval(intervalId);
  }, []);

  //fetch sensor data from firestore
  const fetchSensorDataFromFirestore = async () => {
    try {
      const sensorDataRef = doc(db, 'sensor', 'sensordata');
      const sensorDataSnapshot = await getDoc(sensorDataRef);
  
      if (sensorDataSnapshot.exists()) {
        const data = sensorDataSnapshot.data();
        const temperaturef = data.temperature;
        const humidityf = data.humidity;
  
        console.log('Fetched sensor data:', { temperaturef, humidityf });
        return { temperaturef, humidityf };
      } else {
        console.log('No sensor data found in Firestore.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching sensor data from Firestore:', error);
      return null;
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchSensorDataFromFirestore();
    }, 300005); //5 minutes
    return () => clearInterval(intervalId);
  }, []);

  //sending email (sensor)
  const sendEmailViaSendGrid2 = async (subject, body, recipientEmail) => {
    const SENDGRID_API_KEY = 'hidden';
    const SENDGRID_EMAIL = 'hidden';
  
    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: recipientEmail }],
              subject: subject,
            },
          ],
          from: { email: SENDGRID_EMAIL },
          content: [
            {
              type: 'text/plain',
              value: body,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.status === 202) {
        console.log('Email sent successfully.');
      } else {
        console.error('Failed to send email:', response.status, response.data);
      }
    } catch (error) {
      console.error('Error sending email via SendGrid:', error.response?.data || error.message);
    }
  };
  
  //trigger / message creation for notification
  const checkAndSendCriticalAlerts = async () => {
    const sensorDataRef = doc(db, 'sensor', 'sensordata');
    const user = auth.currentUser;
  
    if (!user) {
      console.error('No user is currently logged in.');
      return;
    }
  
    const recipientEmail = user.email;
  
    try {
      const sensorDataSnapshot = await getDoc(sensorDataRef);
      
      if (sensorDataSnapshot.exists()) {
        const data = sensorDataSnapshot.data();
        const temperaturef = data.temperature;
        const humidityfString = data.humidity;

        const humidityf = parseFloat(humidityfString.replace('%', ''));
  
        console.log('Fetched sensor data:', { temperaturef, humidityf });
  
        if (temperaturef < 35 || temperaturef > 39) {
          const temperatureMessage = `The incubator's temperature is critical at ${temperaturef}°C. Please check the incubator.`;
          sendEmailViaSendGrid2('Critical Temperature Alert', temperatureMessage, recipientEmail);
        }

        if (humidityf < 40 || humidityf > 70) {
          const humidityMessage = `The incubator's humidity is critical at ${humidityf}%. Please check the incubator.`;
          sendEmailViaSendGrid2('Critical Humidity Alert', humidityMessage, recipientEmail);
        }
      } else {
        console.log('No sensor data found in Firestore.');
      }
    } catch (error) {
      console.error('Error fetching sensor data from Firestore:', error);
    }
  };
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkAndSendCriticalAlerts();
    }, 300000); //15 minutes = 900000
  
    return () => clearInterval(intervalId);  
  }, []);

  //handler para maiwasan unexpected routing
  const handleBackButton = () => {
    Alert.alert(
      'Confirm Exit',
      'Do you want to exit?',
      [
        {
          text: 'Cancel',
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => BackHandler.exitApp(),
        },
      ],
      { cancelable: false }
    );
    return true;
  };

  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      return () => backHandler.remove();
    }, [])
  );
  
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  //const toggleNotifications = () => setNotificationsVisible((prev) => !prev);
  
  //alerts api
  const sendEmailViaSendGrid = async (to, subject, body) => {
    const SENDGRID_API_KEY = 'hidden';
    const SENDGRID_EMAIL = 'hidden';
  
    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: to }],
              subject: subject,
            },
          ],
          from: { email: SENDGRID_EMAIL },
          content: [
            {
              type: 'text/plain',
              value: body,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.status === 202) {
        console.log('Email sent successfully.');
        return true;
      } else {
        console.error('Failed to send email:', response.status, response.data);
        return false;
      }
    } catch (error) {
      console.error('Error sending email via SendGrid:', error.response?.data || error.message);
      return false;
    }
  };
  
  //notification logic
  const createNotification = async (batch, message, icon) => {
    const db = getFirestore();
    const user = auth.currentUser;
    // serves as blocker, stops the function when there is no user.
    if (!user) {
      console.error('User is not authenticated.');
      return;
    }
    try { //gets user doc from firebase
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      //blocker, stops when there is no doc from firebase
      if (!userDoc.exists()) {
        console.error('User data not found in Firestore.');
        return;
      }
      //handles user information and setting up data for notification
      const userData = userDoc.data();
      const userMobileNum = userData.mobilenum || "Unknown";
      const notificationData = {
        batchid: batch.id,
        uid: user.uid,
        mobilenum: userMobileNum,
        message: message,
        icon: icon,
        time: Timestamp.now(),
        markasread: false,
        sms: "no",
        email: user.email,
      };
  
      const batchNotifCollection = collection(db, 'batchNotif');
      //another duplication check
      const duplicateCheckQuery = query(
        batchNotifCollection,
        where('batchid', '==', notificationData.batchid),
        where('message', '==', notificationData.message),
      );
      const existingNotifications = await getDocs(duplicateCheckQuery);
      //if duplicates are found, do not create. return.
      if (!existingNotifications.empty) {
        console.log('Duplicate notification detected. No new notification created.');
        return;
      }
      const docRef = await addDoc(batchNotifCollection, notificationData);
      console.log(`Notification successfully created for batch: ${batch.batchName}`);
      //handles email content
      const emailSubject = `New Notification for Batch ${batch.batchName}`;
      const emailBody = message;
  
      const emailSent = await sendEmailViaSendGrid(user.email, emailSubject, emailBody);
      //used as a "checker", to save on firebase that the email has been sent. 
      if (emailSent) {
        console.log('Email sent successfully.');
        await updateDoc(doc(db, 'batchNotif', docRef.id), { sms: 'yes' });
        console.log('Notification SMS field marked as "yes".');
      }
    } catch (error) {
      console.error('Error while creating notification or sending email:', error);
    }
  };

//for notification retrieval 
useEffect(() => {
  if (batches.length === 0) return;

  const db = getFirestore();
  const batchIds = batches.map(batch => batch.id);
  const unsubscribe = onSnapshot(
    query(collection(db, 'batchNotif'), where('batchid', 'in', batchIds)),
    (querySnapshot) => {
      const notificationsList = [];
      let unreadCount = 0;

      querySnapshot.forEach((doc) => {
        const notification = doc.data();

        if (notification.time instanceof Timestamp) {
          notificationsList.push({
            id: doc.id,
            message: notification.message,
            icon: notification.icon,
            time: notification.time.toDate(),
            markasread: notification.markasread || false,
          });
          
          if (notification.markasread !== "Yes") unreadCount++;
        } else {
          console.warn(`Notification with ID ${doc.id} is missing a valid time field:`, notification);
        }
      });

      setNotifications(notificationsList);
      setUnreadNotificationsCount(unreadCount); 
    },
    (error) => {
      console.error('Error fetching notifications in real-time:', error);
    }
  );

  return () => unsubscribe();
}, [batches]);

//function para ihandle yung data sa loob ng batch
useEffect(() => {
  const updatedBatchStatuses = {};

  batches.forEach((item) => {
    const [month, day, year] = item.startDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const currentDate = new Date();
    const dayDifference = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const displayDay = dayDifference + 1;

    updatedBatchStatuses[item.id] = displayDay;

    const mode = displayDay > 17 ? 'Lockdown' : 'Incubating'; //17 dapat to
    const db = getDatabase();
    const modeRef = ref(rtdb, '/mode');
    set(modeRef, mode);
  });

  setBatchStatuses(updatedBatchStatuses);
}, [batches]);

const renderBatchItem = ({ item }) => {
  const displayDay = batchStatuses[item.id] || 0;
  const batchStatus = displayDay;

const handleInfoClick = (item) => {
  setSelectedBatch(item)
};

const handleCloseModal = () => {
  setSuccessRateModalVisible(false);
  setRemarksModalVisible(false);
  setSelectedBatch(null);
};

    return (
      <View className="bg-[#ede8d0] p-4 rounded-lg mb-4 relative" key={item.id}>
        <TouchableOpacity
          onPress={() => {
            setRemarksModalVisible(true);
            setIsReadOnly(true);
          }}
          className="absolute top-2 right-2 w-10 h-10 rounded-full bg-[] flex items-center justify-center z-10"
          //className="absolute top-2 right-2 w-10 h-10 rounded-full bg-[#d3c4a8] flex items-center justify-center z-10"
        >
          <Image source={info} className="w-5 h-5" alt="Information Icon" />
        </TouchableOpacity>

        <Text className="font-pbold text-lg">Batch Name: {item.batchName}</Text>
        <Text className="font-pmedium">Start Date: {item.startDate}</Text>
        <Text className="font-pmedium">Day: {batchStatus} 
          {batchStatus >= 18 && batchStatus <= 21 && (
            <Text className="text-red-500"> (Lockdown Mode)</Text>
          )}
        </Text>
        <Text className="font-pmedium">Number of Eggs: {item.numberOfEggs}</Text>
        <Text className="font-pmedium">Status: {item.status}</Text>
  
        {batchStatus >= 21 && (
          <TouchableOpacity
            onPress={() => {
              setSelectedBatch(item); 
              setModalVisible(true); 
            }}
            className="mt-4 bg-[#5f432c] py-2 px-4 rounded-lg"
          >
            <Text className="text-white font-psemibold text-center">Enter Success Rate</Text>
          </TouchableOpacity>
        )}

        {[5, 10, 15].includes(batchStatus) && (
          <TouchableOpacity
            onPress={() => {
              setSelectedBatch(item);
              setRemarksModalVisible(true);
              setIsReadOnly(false);
            }}
            className="mt-4 bg-[#5f432c] py-2 px-4 rounded-lg"
          >
            <Text className="text-white font-psemibold text-center">Add Remarks</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  //functon for when the user clicks the finish batch button
  const handleFinishBatch = async () => {
    if (selectedBatch) {
      const totalEggs = selectedBatch.numberOfEggs;
      const hatchesCount = Number(hatchedEggs);
  
      if (hatchesCount > totalEggs) {
        Alert.alert('Error', `Please input a number that does not exceed the batch's number of eggs, which is ${totalEggs}!`);
        return;
      }
  
      try {
        const batchDocRef = doc(db, 'batches', selectedBatch.id);
        const formattedDate = new Date()
          .toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          .replace(/\//g, '-');
  
        await updateDoc(batchDocRef, {
          hatches: hatchesCount,
          status: 'finished',
          endDate: formattedDate,
        });
  
        const rtdbBatchRef = ref(rtdb, `batches/${selectedBatch.id}`);
        await remove(rtdbBatchRef);
  
        Alert.alert(
          'Success',
          `Batch updated with ${hatchesCount} hatched eggs and marked as finished.`
        );
        console.log(
          `Batch updated with Hatched Eggs: ${hatchedEggs}, status: finished, and removed from RTDB`
        );
  
        fetchUserData();
        setModalVisible(false);
        setHatchedEggs('');
      } catch (error) {
        console.error('Error updating batch hatches:', error);
        Alert.alert('Error', 'Failed to update the batch. Please try again.');
      }
    }
  };

  //forda write remarks
  const handleSubmitRemarks = async () => {
    if (selectedBatch && batchRemarks) {
      const dayToUpdate = batchStatuses[selectedBatch.id];
      let fieldToUpdate;
  
      if (dayToUpdate === 5) {
        fieldToUpdate = 'day5';
      } else if (dayToUpdate === 10) {
        fieldToUpdate = 'day10';
      } else if (dayToUpdate === 15) {
        fieldToUpdate = 'day15';
      } else {
        Alert.alert("Invalid day", "Remarks can only be added on days 5, 10, or 15.");
        return;
      }
  
      try {
        const batchDocRef = doc(db, 'batches', selectedBatch.id);
        await updateDoc(batchDocRef, {
          [fieldToUpdate]: batchRemarks,
        });
  
        Alert.alert('Success', `Remarks for Day ${dayToUpdate} added successfully.`);
        setRemarksModalVisible(false);
        setBatchRemarks('');
      } catch (error) {
        console.error("Error updating remarks:", error);
        Alert.alert("Error", "Failed to add remarks. Please try again.");
      }
    } else {
      Alert.alert("Error", "Please enter remarks before submitting.");
    }
  };
//for the notifications panel visibility
const toggleNotifications = () => {
  console.log(notificationsVisible ? "Notification panel closed" : "Notification panel opened");
  setNotificationsVisible((prev) => !prev);
};

return (
  <SafeAreaView className="flex-1">
    {loading ? (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4">Loading...</Text>
      </View>
    ) : (
      <FlatList
        data={batches}
        keyExtractor={(item) => item.id}
        refreshing={notificationsVisible ? false : refreshing}
        onRefresh={notificationsVisible ? null : onRefresh}
        ListHeaderComponent={() => (
          <View className="my-12 px-4 space-y-8">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="font-pmedium text-lg">Welcome,</Text>
                <Text className="font-psemibold text-2xl">{username}</Text>
              </View>

              <TouchableOpacity
                onPress={toggleNotifications} 
                className="justify-center mt-2 mx-3 md:mx-4 lg:mx-5"
              >
                <Image
                  source={notificationIcon}
                  className="w-8 md:w-7 lg:w-8 h-8"
                  resizeMode="contain"
                />
                {unreadNotificationsCount > 0 && (
                  <View className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full" />
                )}
              </TouchableOpacity>
            </View>

            <Notification
              notifications={notifications}
              visible={notificationsVisible}
              onClose={toggleNotifications}
              batches={batches}
            />

            <View className="flex-row justify-between mb-4">
              <View className="bg-[#c4b191] p-5 rounded-lg items-center flex-1 mr-2">
                <Text className="font-pmedium text-sm">Temperature</Text>
                <Text 
                  className={`font-psemibold text-4xl mt-2 ${temperature <= 36.9 || temperature >= 39.1 ? 'text-red-500' : ''}`}
                >
                  {temperature}°C
                </Text>
              </View>

              <View className="flex-1 ml-2 items-center">
                <Text className="font-pmedium text-sm mt-5">Humidity</Text>
                <Text 
                  className={`font-psemibold text-4xl mt-2 ${
                    batches.length > 0 && batches[0].status === 'ongoing'
                      ? (humidity <= '39%' || humidity >= '69%' ? 'text-red-500' : '') 
                      : (humidity <= '39%' || humidity >= '69%' ? 'text-red-500' : '')
                  }`}
                >
                  {humidity}
                </Text>
              </View>
            </View>

            <View className="my-6">
              <Text className="font-psemibold text-xl mb-4">Batches</Text>

              {batches.length === 0 ? (
                <View className="flex items-center justify-center mt-4">
                  <Text className="font-pmedium text-lg text-gray-500">No batch created</Text>
                </View>
              ) : (
                <FlatList
                  data={batches}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBatchItem}
                />
              )}
            </View>
          </View>
        )}
      />
    )}

    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="bond"
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg w-4/5 max-w-md shadow-lg">
          <Text className="font-psemibold text-xl mb-4 text-center">Egg Status</Text>
          <Text className="font-pmedium mb-2">Hatched Eggs</Text>
          <TextInput
            value={hatchedEggs}
            onChangeText={setHatchedEggs}
            placeholder="Enter hatched eggs"
            keyboardType="numeric"
            className="border border-gray-300 p-2 rounded-lg mb-4"
          />
          <View className="flex-row justify-between mt-4">
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="bg-gray-300 p-2 rounded-lg flex-1 mr-1"
            >
              <Text className="text-center font-psemibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFinishBatch}
              className="bg-[#5f432c] p-2 rounded-lg flex-1 ml-1"
            >
              <Text className="text-center text-white font-psemibold">Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={remarksModalVisible && !isReadOnly}
      transparent={true}
      animationType="bond"
      onRequestClose={() => setRemarksModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black bg-black/50">
        <View className="bg-white p-6 rounded-lg w-3/4">
          <Text className="text-lg font-psemibold mb-4 text-center">Remarks</Text>
          <TextInput
            className="border border-gray-300 p-1 rounded-md mb-1 h-20"
            placeholder="Enter remarks"
            value={batchRemarks}
            onChangeText={setBatchRemarks}
            multiline={true}
            textAlignVertical="top"
          />
          <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            onPress={() => setRemarksModalVisible(false)}
            className="bg-gray-100 py-2 px-4 rounded-lg w-1/2 mr-1"
          >
            <Text className="text-center font-psemibold">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmitRemarks}
            className="bg-[#5f432c] py-2 px-4 rounded-lg flex-1"
          >
            <Text className="text-white font-psemibold text-center">Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </Modal>

    <Modal
      visible={remarksModalVisible && isReadOnly}
      transparent={true}
      animationType="bond"
      onRequestClose={() => setRemarksModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white p-6 rounded-lg w-3/4">
          <Text className="text-lg font-psemibold mb-4 text-center">View Remarks</Text>
          {batches.length > 0 ? (
            batches.map((batch) => (
              <View key={batch.id}>

                <Text className="text-md font-psemibold mb-2">Day 5 Remarks:</Text>
                <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                  {batch.batchRemarks.day5}
                </Text>

                <Text className="text-md font-psemibold mb-2">Day 10 Remarks:</Text>
                <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                  {batch.batchRemarks.day10}
                </Text>

                <Text className="text-md font-psemibold mb-2">Day 15 Remarks:</Text>
                <Text className="border-2 border-gray-400 p-2 rounded-md mb-4 h-20">
                  {batch.batchRemarks.day15}
                </Text>
              </View>
            ))
          ) : (
            <Text>No batches available.</Text>
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

  </SafeAreaView>

);
};
export default Home;