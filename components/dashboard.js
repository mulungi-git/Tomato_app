import { useState, useRef, forwardRef, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  StyleSheet,
  View,
  Platform,
  Pressable,
  Text,
  ImageBackground,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import domtoimage from "dom-to-image";

import Button from "../elements/Button";
import ImageViewer from "../elements/ImageViewer";
import CircleButton from "../elements/CircleButton";
import IconButton from "../elements/IconButton";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRoute } from "@react-navigation/native";
import { ActivityIndicator } from "react-native";

// Import the modules you need from Firebase
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const PlaceholderImage = require("../assets/giffy.gif");
const image = require('../assets/bg.png');
const storage = getStorage();

const Dashboard = forwardRef(({ navigation }, ref) => {
  // Hooks
  const [modalVisible, setModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showAppOptions, setShowAppOptions] = useState(false);
  const [pickedEmoji, setPickedEmoji] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();
  const imageRef = useRef();
  const route = useRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Camera and Gallery Logic
  useEffect(() => {
    const { takenImage } = route.params || {};
    if (takenImage) {
      setSelectedImage(takenImage);
      setShowAppOptions(true);
    }
  }, [route.params]);

  if (status === null) {
    requestPermission();
  }

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowAppOptions(true);
    } else {
      alert("You did not select any image.");
    }
  };

  const uploadImage = async () => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", {
      uri: selectedImage,
      type: "image/jpeg",
      name: "image.jpg",
    });

    try {
      const response = await fetch(
        "https://tmv.onrender.com/predict",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Error uploading image");
      }

      const data = await response.json();
      setResults(data);
      // Handle the response data as needed
      console.log(data);

      setIsLoading(false);
      setModalVisible(true); // Display the popup after receiving the results
    } catch (error) {
      console.log("Error:", error);
      setIsLoading(false);
    }
  };

  const onReset = () => {
    setShowAppOptions(false);
  };

  const onAddSticker = () => {
    setIsModalVisible(true);
  };

  const onModalClose = () => {
    setIsModalVisible(false);
  };

  const onSaveImageAsync = async () => {
    if (Platform.OS !== "web") {
      try {
        const localUri = await captureRef(imageRef, {
          height: 440,
          
          quality: 1,
        });
  
        // Get a reference to the storage service
        const storage = getStorage();
  
        // Create a storage reference for the image
        const imageStorageRef = ref(storage, "images/" + Date.now() + ".jpg");
  
        // Create a Blob object from the local file URI
        const response = await fetch(localUri);
        const blob = await response.blob();
  
        // Upload the Blob object to Firebase Storage
        const uploadTask = uploadBytes(imageStorageRef, blob);
  
        // Wait for the upload to complete
        await uploadTask;
        
        // Get the download URL of the uploaded image
        const imageUrl = await getDownloadURL(imageStorageRef);
  
        // Perform any additional actions with the image URL (e.g., save to Firestore)
  
        alert("Saved!");
  
      } catch (e) {
        console.log(e);
      }
    } else {
      domtoimage
        .toJpeg(imageRef.current, {
          quality: 0.95,
          width: 320,
          height: 440,
        })
        .then((dataUrl) => {
          let link = document.createElement("a");
          link.download = "1.jpeg";
          link.href = dataUrl;
          link.click();
        })
        .catch((e) => {
          console.log(e);
        });
    }
  };
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <ImageBackground source={image} resizeMode="cover" style={styles.image}>
        <View style={[styles.horizontal]}>
          {isLoading && <ActivityIndicator size="large" color="#00ff00" />}
        </View>
      <View style={styles.imageContainer}>
        <Text style={styles.paragraph}>
          Use Left button to open camera, or Right button open gallery
        </Text>
        <View ref={imageRef} collapsable={false}>
          <ImageViewer
            ref={imageRef}
            placeholderImageSource={PlaceholderImage}
            selectedImage={selectedImage}
          />
        </View>
      </View>
      {showAppOptions ? (
          <><Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              Alert.alert("Closed");
              setModalVisible(!modalVisible);
            } }
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.baseText}>
                  <View style={styles.titleText}>
                    <Text style={styles.heading}>Diagnosis Results</Text>
                  </View>
                  <View style={styles.resultsContainer}>
                    {results ? (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultClass}>
                          Predicted Class: {results.class}
                        </Text>
                        <Text style={styles.resultScore}>
                          Confidence Score: {(((results.confidence)* 100).toFixed(2) + '%')}
                        </Text>
                      </View>
                    ) : (
                      <Text>No results to display.</Text>
                    )}
                  </View>
                </Text>
                <Pressable
                  style={[styles.button, styles.buttonClose]}
                  onPress={() => setModalVisible(!modalVisible)}
                >
                  <MaterialIcons name="close" size={38} color="white" />
                </Pressable>
              </View>
            </View>
          </Modal><View style={styles.optionsRow}>
              <IconButton icon="refresh" label="Reset" onPress={onReset} />
              <CircleButton
                onPress={() => {
                  uploadImage();
                } } />
              {/* <CircleButton
      onPress={() => {
        setModalVisible(true);
      }}
    /> */}
              <IconButton
                icon="save-alt"
                label="Save"
                onPress={onSaveImageAsync} />
            </View></>
      ) : (
        <>
          <View style={styles.footerContainer1}>
            <Button
              theme="secondary"
              label="Use Camera"
              onPress={() =>
                navigation.navigate("Camera", {
                  setDashboardImage: setSelectedImage,
                })
              }
            />

            <Button
              theme="primary"
              label="Use Gallery"
              onPress={pickImageAsync}
            />
          </View>
          {/* <View style={styles.footerContainer}>
            <Button
              label="Use this photo"
              onPress={() => setShowAppOptions(true)}
            />
          </View> */}
        </>
      )}
      {/* <EmojiPicker isVisible={isModalVisible} onClose={onModalClose}>
        <EmojiList onSelect={setPickedEmoji} onCloseModal={onModalClose} />
      </EmojiPicker> */}
      <StatusBar style="auto" />
      </ImageBackground>
    </GestureHandlerRootView>
  );
});

export default Dashboard;

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  background: {
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    // alignItems: "center",
    // justifyContent: "center",
  },
  image: {
    flex: 1,
    justifyContent: 'center',
  },
  imageContainer: {
    paddingTop: 58,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: "auto",
    justifyContent: 'center',
  },
  paragraph: {
    margin: 24,
    marginTop: 0,
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  baseText: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 25,
    fontWeight: "bold",
    color: "yellow",
    textAlign: "center",
  },
  titleText: {
    flex: 1,
    justifyContent: "center",
    padding: "5%",
    paddingLeft: "0%",
    paddingRight: "0%",
  },
  titleText1: {
    fontSize: 20,
    fontWeight: "bold",
    color: "tomato",
    textAlign: "left",
    padding: "5%",
    paddingLeft: "0%",
    paddingRight: "0%",
  },
  class: {
    color: "white",
  },
  footerContainer1: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    margin: "2%",
    marginTop: "5%",
    marginBottom: "22%",
    paddingBottom: 0,
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: "center",
  },
  // optionsContainer: {
  //   position: "absolute",
  //   bottom: 80,
  // },
  optionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    margin: "2%",
    marginTop: "5%",
    marginBottom: "22%",
    paddingBottom: 0,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "red",
  },
  textStyle: {
    flex: 1,
    color: "white",
    fontWeight: "bold",
    alignContent: "flex-end",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultItem: {
    marginBottom: 5,
  },
  resultClass: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  resultScore: {
    fontSize: 14,
    color: "white",
  },
});
