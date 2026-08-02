import { Alert, Platform } from "react-native";

/**
 * Alert.alert é um no-op no React Native Web (não faz nada nessa
 * plataforma - node_modules/react-native-web/.../Alert/index.js é uma
 * classe vazia). Como o app roda como link web, usa window.alert/confirm
 * lá em vez de Alert.alert, senão nenhuma mensagem (nem confirmação de
 * ações destrutivas) aparece pro usuário.
 */
export function alertar(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmar(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "Confirmar"
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
