import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const ProfileScreen = () => {
  const handleSubmit = () => {
    Alert.alert("Success", "Your profile has been updated successfully!", [
      { text: "OK", onPress: () => console.log("OK Pressed") },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Enter your full name" />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Tell us about yourself"
          multiline
        />

        <Text style={styles.hint}>
          Your bio should be at least 50 characters long
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save Changes</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Last updated: Yesterday at 2:30 PM</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  multiline: {
    height: 100,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 12,
  },
});
