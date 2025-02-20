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
        <Text style={styles.title}>{t("ProfileScreen.pageTitle")}</Text>

        <View style={styles.form}>
          <Text style={styles.label}>{t("ProfileScreen.fullNameLabel")}</Text>
          <TextInput style={styles.input} placeholder={t("ProfileScreen.fullNamePlaceholder")} />

          <Text style={styles.label}>{t("ProfileScreen.bioLabel")}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder={t("ProfileScreen.bioPlaceholder")}
            multiline
          />

          <Text style={styles.hint}>
            {t("ProfileScreen.bioGuideline")}
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>{t("ProfileScreen.saveButtonText")}</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>{t("ProfileScreen.lastUpdateStatus")}</Text>
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
