import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSignatures } from "@/lib/signatures-context";
import { useAdminConfig } from "@/lib/admin-config-context";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { cn } from "@/lib/utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { clearAllAppData } from "@/lib/clear-all-data";
import { alertar, confirmar } from "@/lib/alert";

type TabType = "executantes" | "lideres" | "inspetores" | "emails" | "admin";

export default function SettingsScreen() {
  const colors = useColors();
  const signatures = useSignatures();
  const adminConfig = useAdminConfig();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("executantes");
  const [isResetting, setIsResetting] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");

  // Admin Config States
  const [smtpEmail, setSmtpEmail] = useState(adminConfig.config?.smtp.email || "");
  const [smtpServidor, setSmtpServidor] = useState(adminConfig.config?.smtp.servidor || "");
  const [smtpPorta, setSmtpPorta] = useState(adminConfig.config?.smtp.porta || "");
  const [smtpSenha, setSmtpSenha] = useState(adminConfig.config?.smtp.senha || "");

  const [networkUrl, setNetworkUrl] = useState(adminConfig.config?.network.url || "");
  const [networkUsuario, setNetworkUsuario] = useState(adminConfig.config?.network.usuario || "");
  const [networkSenha, setNetworkSenha] = useState(adminConfig.config?.network.senha || "");
  const [networkHost, setNetworkHost] = useState(adminConfig.config?.network.host || "");
  const [networkPort, setNetworkPort] = useState(adminConfig.config?.network.port || "");
  const [networkDatabase, setNetworkDatabase] = useState(adminConfig.config?.network.database || "");
  const [novoEmail, setNovoEmail] = useState("");

  const handleAdicionarExecutante = async () => {
    if (!nomeCompleto.trim() || !matricula.trim()) {
      alertar("Erro", "Preencha Nome Completo e Matrícula");
      return;
    }
    try {
      await signatures.adicionarExecutante(nomeCompleto, matricula, email || undefined);
      setNomeCompleto("");
      setMatricula("");
      setEmail("");
      alertar("Sucesso", "Executante adicionado!");
    } catch (error) {
      alertar("Erro", "Não foi possível cadastrar o executante. Verifique sua conexão e tente novamente.");
    }
  };

  const handleAdicionarLider = async () => {
    if (!nomeCompleto.trim() || !matricula.trim()) {
      alertar("Erro", "Preencha Nome Completo e Matrícula");
      return;
    }
    try {
      await signatures.adicionarLider(nomeCompleto, matricula, email || undefined);
      setNomeCompleto("");
      setMatricula("");
      setEmail("");
      alertar("Sucesso", "Líder adicionado!");
    } catch (error) {
      alertar("Erro", "Não foi possível cadastrar o líder. Verifique sua conexão e tente novamente.");
    }
  };

  const handleAdicionarInspetor = async () => {
    if (!nomeCompleto.trim() || !matricula.trim()) {
      alertar("Erro", "Preencha Nome Completo e Matrícula");
      return;
    }
    try {
      await signatures.adicionarInspetor(nomeCompleto, matricula, email || undefined);
      setNomeCompleto("");
      setMatricula("");
      setEmail("");
      alertar("Sucesso", "Inspetor adicionado!");
    } catch (error) {
      alertar("Erro", "Não foi possível cadastrar o inspetor. Verifique sua conexão e tente novamente.");
    }
  };

  const handleRemoverExecutante = (id: string, nome: string) => {
    confirmar("Remover", `Tem certeza que deseja remover ${nome}?`, async () => {
      try {
        await signatures.removerExecutante(id);
        alertar("Sucesso", "Executante removido!");
      } catch (error) {
        alertar("Erro", "Não foi possível remover. Verifique sua conexão e tente novamente.");
      }
    }, "Remover");
  };

  const handleRemoverLider = (id: string, nome: string) => {
    confirmar("Remover", `Tem certeza que deseja remover ${nome}?`, async () => {
      try {
        await signatures.removerLider(id);
        alertar("Sucesso", "Líder removido!");
      } catch (error) {
        alertar("Erro", "Não foi possível remover. Verifique sua conexão e tente novamente.");
      }
    }, "Remover");
  };

  const handleRemoverInspetor = (id: string, nome: string) => {
    confirmar("Remover", `Tem certeza que deseja remover ${nome}?`, async () => {
      try {
        await signatures.removerInspetor(id);
        alertar("Sucesso", "Inspetor removido!");
      } catch (error) {
        alertar("Erro", "Não foi possível remover. Verifique sua conexão e tente novamente.");
      }
    }, "Remover");
  };

  const handleSalvarSMTP = async () => {
    try {
      await adminConfig.updateSMTPConfig({
        email: smtpEmail,
        servidor: smtpServidor,
        porta: smtpPorta,
        senha: smtpSenha,
      });
      alertar("Sucesso", "Configuração SMTP salva!");
    } catch (error) {
      alertar("Erro", "Erro ao salvar configuração SMTP");
    }
  };

  const handleSalvarNetwork = async () => {
    try {
      await adminConfig.updateNetworkConfig({
        url: networkUrl,
        usuario: networkUsuario,
        senha: networkSenha,
        host: networkHost,
        port: networkPort,
        database: networkDatabase,
      });
      alertar("Sucesso", "Configuração de Rede salva!");
    } catch (error) {
      alertar("Erro", "Erro ao salvar configuração de Rede");
    }
  };

  const handleCopiarLink = async () => {
    if (adminConfig.config?.linkGerencial) {
      await Clipboard.setStringAsync(adminConfig.config.linkGerencial);
      alertar("Sucesso", "Link copiado para a área de transferência!");
    }
  };

  const handleAdicionarEmail = async () => {
    if (!novoEmail.trim()) {
      alertar("Erro", "Digite um e-mail válido");
      return;
    }
    try {
      await adminConfig.addEmailRecebimento(novoEmail);
      setNovoEmail("");
      alertar("Sucesso", "E-mail adicionado!");
    } catch (error) {
      alertar("Erro", "Erro ao adicionar e-mail");
    }
  };

  const handleRemoverEmail = async (emailToRemove: string) => {
    try {
      await adminConfig.removeEmailRecebimento(emailToRemove);
      alertar("Sucesso", "E-mail removido!");
    } catch (error) {
      alertar("Erro", "Erro ao remover e-mail");
    }
  };

  const handleAdminLogin = () => {
    if (adminLogin === "admin" && adminPassword === "admin") {
      setIsAdminAuthenticated(true);
      alertar("Sucesso", "Bem-vindo ao Administrador!");
    } else {
      alertar("Erro", "Login ou senha incorretos");
      setAdminPassword("");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminLogin("");
    setAdminPassword("");
    setActiveTab("executantes");
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="gap-4">
          {/* Cabeçalho */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xl font-bold text-foreground">Configurações</Text>
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                onPress={() =>
                  confirmar("Sair", "Deseja sair da sua conta?", () => signOut(), "Sair")
                }
                className="p-2"
              >
                <MaterialIcons name="logout" size={24} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAdminMenu(!showAdminMenu)}
                className="p-2"
              >
                <MaterialIcons name="more-vert" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu de Três Pontinhos */}
          {showAdminMenu && (
            <View className="bg-surface border border-border rounded-lg p-2">
              <TouchableOpacity
                onPress={() => {
                  setShowAdminMenu(false);
                  setActiveTab("admin");
                }}
                className="p-3 flex-row items-center gap-2"
              >
                <MaterialIcons name="admin-panel-settings" size={20} color={colors.primary} />
                <Text className="text-foreground font-semibold">Área do Administrador</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Abas */}
          <View className="flex-row gap-2 border-b border-border pb-2 flex-wrap">
            {(["executantes", "lideres", "inspetores", "emails"] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-2 rounded-lg",
                  activeTab === tab ? "bg-primary" : "bg-surface"
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    activeTab === tab ? "text-background" : "text-foreground"
                  )}
                >
                  {tab === "executantes"
                    ? "Executantes"
                    : tab === "lideres"
                      ? "Líderes"
                      : tab === "inspetores"
                        ? "Inspetores"
                        : "E-mails"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Aba Administrador - COM PROTEÇÃO DE LOGIN */}
          {activeTab === "admin" && (
            <View className="gap-4">
              {!isAdminAuthenticated ? (
                <View className="gap-4 bg-surface border border-border rounded-lg p-6">
                  <Text className="text-2xl font-bold text-foreground text-center mb-4">
                    🔐 Administrador
                  </Text>

                  <View className="gap-3">
                    <Text className="text-sm font-semibold text-foreground">Login</Text>
                    <TextInput
                      placeholder="Digite seu login"
                      value={adminLogin}
                      onChangeText={setAdminLogin}
                      className="border border-border rounded-lg p-3 text-foreground"
                      placeholderTextColor={colors.muted}
                    />
                  </View>

                  <View className="gap-3">
                    <Text className="text-sm font-semibold text-foreground">Senha</Text>
                    <TextInput
                      placeholder="Digite sua senha"
                      value={adminPassword}
                      onChangeText={setAdminPassword}
                      secureTextEntry
                      className="border border-border rounded-lg p-3 text-foreground"
                      placeholderTextColor={colors.muted}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleAdminLogin}
                    className="bg-primary rounded-lg p-4 mt-4"
                  >
                    <Text className="text-center text-background font-bold text-lg">Entrar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-4">
                  <View className="flex-row items-center justify-between bg-success/10 border border-success rounded-lg p-3 mb-4">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="verified-user" size={24} color={colors.success} />
                      <Text className="text-sm font-semibold text-success">Autenticado</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleAdminLogout}
                      className="bg-error rounded-lg px-3 py-2"
                    >
                      <Text className="text-white text-xs font-semibold">Sair</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Seção SMTP */}
                  <View className="gap-3">
                    <Text className="text-lg font-bold text-foreground">Configuração SMTP</Text>
                    <Text className="text-xs text-muted">Para envio automático de checklists</Text>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Email de Envio</Text>
                      <TextInput
                        placeholder="caldeiraria@mde.ind.br"
                        value={smtpEmail}
                        onChangeText={setSmtpEmail}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Servidor SMTP</Text>
                      <TextInput
                        placeholder="Ex: smtp.gmail.com"
                        value={smtpServidor}
                        onChangeText={setSmtpServidor}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Porta</Text>
                      <TextInput
                        placeholder="587"
                        value={smtpPorta}
                        onChangeText={setSmtpPorta}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Senha</Text>
                      <TextInput
                        placeholder="Senha do email"
                        value={smtpSenha}
                        onChangeText={setSmtpSenha}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                        secureTextEntry
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSalvarSMTP}
                      className="bg-primary rounded-lg p-3"
                    >
                      <Text className="text-center text-background font-semibold">
                        Salvar Configuração SMTP
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Seção Rede */}
                  <View className="gap-3 border-t border-border pt-4">
                    <Text className="text-lg font-bold text-foreground">Configuração de Rede</Text>
                    <Text className="text-xs text-muted">Acesso ao servidor da empresa</Text>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">URL/IP do Servidor</Text>
                      <TextInput
                        placeholder="Ex: 192.168.1.100"
                        value={networkUrl}
                        onChangeText={setNetworkUrl}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Usuário de Rede</Text>
                      <TextInput
                        placeholder="Ex: usuario_rede"
                        value={networkUsuario}
                        onChangeText={setNetworkUsuario}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Senha de Rede</Text>
                      <TextInput
                        placeholder="Senha de acesso"
                        value={networkSenha}
                        onChangeText={setNetworkSenha}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                        secureTextEntry
                      />
                    </View>

                    <View className="gap-2 border-t border-border pt-4 mt-2">
                      <Text className="text-sm font-semibold text-foreground">Host do Banco de Dados</Text>
                      <TextInput
                        placeholder="Ex: localhost"
                        value={networkHost}
                        onChangeText={setNetworkHost}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Porta do Banco</Text>
                      <TextInput
                        placeholder="Ex: 3306"
                        value={networkPort}
                        onChangeText={setNetworkPort}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">Nome do Banco de Dados</Text>
                      <TextInput
                        placeholder="Ex: checklists_db"
                        value={networkDatabase}
                        onChangeText={setNetworkDatabase}
                        className="border border-border rounded-lg p-3 text-foreground"
                        placeholderTextColor={colors.muted}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSalvarNetwork}
                      className="bg-primary rounded-lg p-3"
                    >
                      <Text className="text-center text-background font-semibold">
                        Salvar Configuração de Rede
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Link Gerencial */}
                  <View className="gap-3 border-t border-border pt-4">
                    <Text className="text-lg font-bold text-foreground">Link Gerencial</Text>
                    <Text className="text-xs text-muted">Acesso ao dashboard e downloads</Text>

                    {adminConfig.config?.linkGerencial ? (
                      <View className="bg-surface border border-border rounded-lg p-3 gap-2">
                        <Text className="text-xs text-muted">Link gerado:</Text>
                        <Text className="text-xs text-foreground font-mono break-words">
                          {adminConfig.config.linkGerencial}
                        </Text>
                        <TouchableOpacity
                          onPress={handleCopiarLink}
                          className="bg-primary rounded-lg p-2 mt-2"
                        >
                          <Text className="text-center text-background font-semibold text-xs">
                            Copiar Link
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="bg-surface border border-border rounded-lg p-3">
                        <Text className="text-xs text-muted">
                          Configure SMTP e Rede para gerar o link gerencial
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Reset Completo */}
                  <View className="gap-3 border-t border-border pt-4">
                    <Text className="text-lg font-bold text-error">Limpar Todos os Dados</Text>
                    <Text className="text-xs text-muted">Esta ação é irreversível</Text>

                    <TouchableOpacity
                      onPress={handleResetAllData}
                      disabled={isResetting}
                      className={cn(
                        "rounded-lg p-3",
                        isResetting ? "bg-muted" : "bg-error"
                      )}
                    >
                      <Text className="text-center text-background font-semibold">
                        {isResetting ? "Limpando..." : "🗑️ Limpar Todos os Dados"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Conteúdo das Abas Originais */}
          {activeTab === "executantes" && (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Nome Completo</Text>
                <TextInput
                  placeholder="Ex: João Silva"
                  value={nomeCompleto}
                  onChangeText={setNomeCompleto}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Matrícula</Text>
                <TextInput
                  placeholder="Ex: 12345"
                  value={matricula}
                  onChangeText={setMatricula}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">E-mail (Opcional)</Text>
                <TextInput
                  placeholder="Ex: joao@empresa.com"
                  value={email}
                  onChangeText={setEmail}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                onPress={handleAdicionarExecutante}
                className="bg-primary rounded-lg p-3"
              >
                <Text className="text-center text-background font-semibold">
                  + Adicionar Executante
                </Text>
              </TouchableOpacity>

              {signatures.executantes && signatures.executantes.length > 0 ? (
                <View className="gap-2 mt-4">
                  <Text className="text-sm font-semibold text-foreground">
                    Executantes Cadastrados ({signatures.executantes.length}):
                  </Text>
                  {signatures.executantes.map((exec, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between bg-surface border border-border rounded-lg p-3"
                    >
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{exec.nomeCompleto}</Text>
                        <Text className="text-xs text-muted">Matrícula: {exec.matricula}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoverExecutante(exec.id, exec.nomeCompleto)}
                        className="bg-error rounded-lg px-3 py-2"
                      >
                        <Text className="text-white text-xs font-semibold">Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-lg p-4 mt-4">
                  <Text className="text-sm text-muted text-center">Nenhum executante cadastrado ainda</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "lideres" && (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Nome Completo</Text>
                <TextInput
                  placeholder="Ex: João Silva"
                  value={nomeCompleto}
                  onChangeText={setNomeCompleto}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Matrícula</Text>
                <TextInput
                  placeholder="Ex: 12345"
                  value={matricula}
                  onChangeText={setMatricula}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">E-mail (Opcional)</Text>
                <TextInput
                  placeholder="Ex: joao@empresa.com"
                  value={email}
                  onChangeText={setEmail}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                onPress={handleAdicionarLider}
                className="bg-primary rounded-lg p-3"
              >
                <Text className="text-center text-background font-semibold">
                  + Adicionar Líder
                </Text>
              </TouchableOpacity>

              {signatures.lideres && signatures.lideres.length > 0 ? (
                <View className="gap-2 mt-4">
                  <Text className="text-sm font-semibold text-foreground">
                    Líderes Cadastrados ({signatures.lideres.length}):
                  </Text>
                  {signatures.lideres.map((lider, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between bg-surface border border-border rounded-lg p-3"
                    >
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{lider.nomeCompleto}</Text>
                        <Text className="text-xs text-muted">Matrícula: {lider.matricula}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoverLider(lider.id, lider.nomeCompleto)}
                        className="bg-error rounded-lg px-3 py-2"
                      >
                        <Text className="text-white text-xs font-semibold">Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-lg p-4 mt-4">
                  <Text className="text-sm text-muted text-center">Nenhum líder cadastrado ainda</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "inspetores" && (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Nome Completo</Text>
                <TextInput
                  placeholder="Ex: João Silva"
                  value={nomeCompleto}
                  onChangeText={setNomeCompleto}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Matrícula</Text>
                <TextInput
                  placeholder="Ex: 12345"
                  value={matricula}
                  onChangeText={setMatricula}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">E-mail (Opcional)</Text>
                <TextInput
                  placeholder="Ex: joao@empresa.com"
                  value={email}
                  onChangeText={setEmail}
                  className="border border-border rounded-lg p-3 text-foreground"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                onPress={handleAdicionarInspetor}
                className="bg-primary rounded-lg p-3"
              >
                <Text className="text-center text-background font-semibold">
                  + Adicionar Inspetor
                </Text>
              </TouchableOpacity>

              {signatures.inspetores && signatures.inspetores.length > 0 ? (
                <View className="gap-2 mt-4">
                  <Text className="text-sm font-semibold text-foreground">
                    Inspetores Cadastrados ({signatures.inspetores.length}):
                  </Text>
                  {signatures.inspetores.map((inspetor, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between bg-surface border border-border rounded-lg p-3"
                    >
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{inspetor.nomeCompleto}</Text>
                        <Text className="text-xs text-muted">Matrícula: {inspetor.matricula}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoverInspetor(inspetor.id, inspetor.nomeCompleto)}
                        className="bg-error rounded-lg px-3 py-2"
                      >
                        <Text className="text-white text-xs font-semibold">Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-lg p-4 mt-4">
                  <Text className="text-sm text-muted text-center">Nenhum inspetor cadastrado ainda</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "emails" && (
            <View className="gap-4">
              <Text className="text-lg font-semibold text-foreground mb-2">E-mails para Receber Checklists</Text>
              <Text className="text-sm text-muted mb-4">Adicione e-mails que receberao os checklists</Text>

              <View className="flex-row gap-2">
                <TextInput
                  placeholder="Digite um e-mail"
                  placeholderTextColor={colors.muted}
                  value={novoEmail}
                  onChangeText={setNovoEmail}
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  onPress={handleAdicionarEmail}
                  className="bg-primary rounded-lg px-4 py-3 justify-center"
                >
                  <Text className="text-background font-semibold">+</Text>
                </TouchableOpacity>
              </View>

              {adminConfig.config?.emailsRecebimento && adminConfig.config.emailsRecebimento.length > 0 ? (
                <View className="gap-2 mt-4">
                  <Text className="text-sm font-semibold text-foreground">E-mails cadastrados ({adminConfig.config.emailsRecebimento.length}):</Text>
                  {adminConfig.config.emailsRecebimento.map((email, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between bg-surface border border-border rounded-lg p-3"
                    >
                      <Text className="text-sm text-foreground flex-1">{email}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoverEmail(email)}
                        className="bg-error rounded-lg px-3 py-2"
                      >
                        <Text className="text-white text-xs font-semibold">Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-surface border border-border rounded-lg p-4 mt-4">
                  <Text className="text-sm text-muted text-center">Nenhum e-mail cadastrado ainda</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function handleVerifyAdminPassword() {
    if (adminPassword === "admin") {
      setIsAdminAuthenticated(true);
      alertar("✅ Sucesso", "Autenticação bem-sucedida!");
    } else {
      alertar("❌ Erro", "Senha incorreta!");
      setAdminPassword("");
    }
  }

  async function handleResetAllData() {
    confirmar(
      "⚠️ Confirmar Limpeza",
      "Tem certeza que deseja deletar TODOS os dados do app? Esta ação não pode ser desfeita!",
      async () => {
        setIsResetting(true);
        try {
          const result = await clearAllAppData();
          if (result.success) {
            alertar("✅ Sucesso", `${result.removedCount} chaves removidas. O app será recarregado.`);
            if (typeof location !== "undefined") {
              location.reload();
            }
          } else {
            alertar("❌ Erro", result.message);
          }
        } catch (error) {
          alertar("❌ Erro", `Erro ao limpar dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        } finally {
          setIsResetting(false);
        }
      },
      "Deletar Tudo"
    );
  }
}
