import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-context";

type Mode = "login" | "forgot";

export function LoginScreen() {
  const colors = useColors();
  const { signIn, requestPasswordReset, isPasswordRecovery } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Preencha email e senha.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (error) setErrorMessage(error);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage("Digite seu email para recuperar a senha.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await requestPasswordReset(email.trim());
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    Alert.alert(
      "Email enviado",
      "Se esse email tiver uma conta cadastrada, chegará um link para redefinir a senha."
    );
    setMode("login");
  };

  if (isPasswordRecovery) {
    return <SetNewPasswordScreen />;
  }

  return (
    <ScreenContainer className="p-6 justify-center">
      <Text className="text-2xl font-bold text-foreground mb-2">
        Checklists de Inspeção
      </Text>
      <Text className="text-sm text-muted mb-8">
        {mode === "login" ? "Entre com sua conta para continuar." : "Digite seu email para recuperar a senha."}
      </Text>

      <Text className="text-sm font-semibold text-foreground mb-1">Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="seuemail@empresa.com"
        placeholderTextColor={colors.muted}
        className="bg-surface border border-border rounded-lg px-3 py-3 mb-4 text-foreground"
      />

      {mode === "login" && (
        <>
          <Text className="text-sm font-semibold text-foreground mb-1">Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Sua senha"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-lg px-3 py-3 mb-4 text-foreground"
          />
        </>
      )}

      {errorMessage && (
        <Text className="text-error text-sm mb-4">{errorMessage}</Text>
      )}

      <TouchableOpacity
        onPress={mode === "login" ? handleLogin : handleForgotPassword}
        disabled={isSubmitting}
        className="bg-primary rounded-lg py-3 items-center mb-3"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="text-background font-semibold">
            {mode === "login" ? "Entrar" : "Enviar link de recuperação"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setErrorMessage(null);
          setMode(mode === "login" ? "forgot" : "login");
        }}
        className="items-center py-2"
      >
        <Text className="text-primary text-sm font-semibold">
          {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

function SetNewPasswordScreen() {
  const colors = useColors();
  const { updatePassword, clearPasswordRecovery, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    Alert.alert("Senha atualizada", "Sua senha foi alterada. Entre novamente.", [
      {
        text: "OK",
        onPress: async () => {
          clearPasswordRecovery();
          await signOut();
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="p-6 justify-center">
      <Text className="text-2xl font-bold text-foreground mb-2">Nova senha</Text>
      <Text className="text-sm text-muted mb-8">
        Digite a nova senha para sua conta.
      </Text>

      <Text className="text-sm font-semibold text-foreground mb-1">Nova senha</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Mínimo 6 caracteres"
        placeholderTextColor={colors.muted}
        className="bg-surface border border-border rounded-lg px-3 py-3 mb-4 text-foreground"
      />

      <Text className="text-sm font-semibold text-foreground mb-1">Confirme a nova senha</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Repita a senha"
        placeholderTextColor={colors.muted}
        className="bg-surface border border-border rounded-lg px-3 py-3 mb-4 text-foreground"
      />

      {errorMessage && (
        <Text className="text-error text-sm mb-4">{errorMessage}</Text>
      )}

      <TouchableOpacity
        onPress={handleUpdatePassword}
        disabled={isSubmitting}
        className="bg-primary rounded-lg py-3 items-center"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text className="text-background font-semibold">Salvar nova senha</Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
