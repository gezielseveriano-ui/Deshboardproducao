/**
 * Utilitário para limpar dados de produção do app
 * MANTÉM: Configurações SMTP, Rede, Executantes, Líderes, Inspetores e E-mails
 * APAGA: Checklists, Histórico, Cache, etc
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearAllAppData() {
  try {
    console.log('🧹 Iniciando limpeza de dados de produção...');

    // MANTER: Configurações SMTP, Rede, Executantes, Líderes, Inspetores e E-mails
    // APAGAR: Dados de sessão (checklists, histórico, cache, etc)
    
    // Obter a configuração admin ANTES de limpar
    const adminConfigStr = await AsyncStorage.getItem('admin_config');
    const adminConfig = adminConfigStr ? JSON.parse(adminConfigStr) : null;
    
    // Extrair apenas SMTP e Network (manter)
    const configToKeep = adminConfig ? {
      smtp: adminConfig.smtp || {},
      network: adminConfig.network || {},
    } : null;

    // Obter dados de assinaturas ANTES de limpar (para manter)
    const executantesStr = await AsyncStorage.getItem('mrs_executantes');
    const lideresStr = await AsyncStorage.getItem('mrs_lideres');
    const inspetoresStr = await AsyncStorage.getItem('mrs_inspetores');
    const emailsStr = await AsyncStorage.getItem('mrs_emails');

    const assinaturasParaManter = {
      executantes: executantesStr ? JSON.parse(executantesStr) : null,
      lideres: lideresStr ? JSON.parse(lideresStr) : null,
      inspetores: inspetoresStr ? JSON.parse(inspetoresStr) : null,
      emails: emailsStr ? JSON.parse(emailsStr) : null,
    };

    // Lista de chaves a APAGAR (dados de sessão)
    const keysToDelete = [
      // Relatórios
      'completed_checklists',
      
      // Admin config (será recriada com SMTP e Network)
      'admin_config',
      'company_db_config',
      
      // Checklists em progresso
      'current_checklist',
      'checklist_draft',
      
      // Cache
      'app_cache',
      'sync_queue',
      
      // Histórico
      'checklist_history',
      'sync_history',
    ];

    // Obter todas as chaves do AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`📦 Total de chaves encontradas: ${allKeys.length}`);

    // Filtrar chaves que começam com 'completed_', 'sync_', 'checklist_' (APAGAR)
    // MAS NÃO apagar 'mrs_executantes', 'mrs_lideres', 'mrs_inspetores', 'mrs_emails'
    const keysToRemove = allKeys.filter(key => 
      keysToDelete.includes(key) || 
      key.startsWith('completed_') ||
      key.startsWith('company_') ||
      key.startsWith('sync_') ||
      (key.startsWith('checklist_') && !key.includes('executantes') && !key.includes('lideres') && !key.includes('inspetores') && !key.includes('emails'))
    );

    console.log(`🗑️ Removendo ${keysToRemove.length} chaves...`);

    // Remover chaves de sessão
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ Dados de sessão removidos com sucesso!');
    }

    // RESTAURAR configurações SMTP e Network
    if (configToKeep) {
      console.log('🔧 Restaurando configurações SMTP e Rede...');
      const restoredConfig = {
        smtp: configToKeep.smtp,
        network: configToKeep.network,
        linkGerencial: '',
        emailsRecebimento: [],
      };
      await AsyncStorage.setItem('admin_config', JSON.stringify(restoredConfig));
      console.log('✅ Configurações restauradas!');
    }

    // RESTAURAR dados de assinaturas (Executantes, Líderes, Inspetores, E-mails)
    if (assinaturasParaManter.executantes) {
      await AsyncStorage.setItem('mrs_executantes', JSON.stringify(assinaturasParaManter.executantes));
      console.log('✅ Executantes restaurados!');
    }
    if (assinaturasParaManter.lideres) {
      await AsyncStorage.setItem('mrs_lideres', JSON.stringify(assinaturasParaManter.lideres));
      console.log('✅ Líderes restaurados!');
    }
    if (assinaturasParaManter.inspetores) {
      await AsyncStorage.setItem('mrs_inspetores', JSON.stringify(assinaturasParaManter.inspetores));
      console.log('✅ Inspetores restaurados!');
    }
    if (assinaturasParaManter.emails) {
      await AsyncStorage.setItem('mrs_emails', JSON.stringify(assinaturasParaManter.emails));
      console.log('✅ E-mails restaurados!');
    }

    // Verificar o que ficou
    const remainingKeys = await AsyncStorage.getAllKeys();
    console.log(`📊 Chaves restantes: ${remainingKeys.length}`);
    
    if (remainingKeys.length > 0) {
      console.log('Chaves mantidas:', remainingKeys);
    }

    console.log('✅ LIMPEZA CONCLUÍDA (Configurações SMTP, Rede, Executantes, Líderes, Inspetores e E-mails mantidos)!');
    return {
      success: true,
      message: 'Dados de sessão limpos! Configurações SMTP, Rede, Executantes, Líderes, Inspetores e E-mails mantidos.',
      removedCount: keysToRemove.length,
      configPreserved: !!configToKeep,
    };
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    return {
      success: false,
      message: `Erro ao limpar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

/**
 * Função auxiliar para verificar dados atuais
 */
export async function checkCurrentData() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const data: any = {};

    for (const key of allKeys) {
      const value = await AsyncStorage.getItem(key);
      data[key] = value ? JSON.parse(value) : null;
    }

    return {
      totalKeys: allKeys.length,
      keys: allKeys,
      data,
    };
  } catch (error) {
    console.error('Erro ao verificar dados:', error);
    return null;
  }
}
