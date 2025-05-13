#!/bin/bash
# monitor-bot.sh - Script para monitorar e reiniciar o bot se necessário

# Configurações
BOT_NAME="bot-bacbo"
MAX_RESTART_ATTEMPTS=5
RESTART_COOLDOWN=300 # 5 minutos em segundos
LOG_FILE="/root/bot_logs.txt"

# Função para registrar logs com timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Inicializar contador de reinícios
restart_count=0

log "Iniciando monitoramento do bot $BOT_NAME"

while true; do
  # Verificar se o processo do bot está rodando
  if ! pm2 show $BOT_NAME | grep -q "online"; then
    log "⚠️ Bot não está rodando! Tentando reiniciar..."
    
    # Verificar limite de tentativas
    if [ $restart_count -ge $MAX_RESTART_ATTEMPTS ]; then
      log "🛑 Número máximo de tentativas de reinício atingido ($MAX_RESTART_ATTEMPTS). Aguardando período de resfriamento..."
      sleep $RESTART_COOLDOWN
      restart_count=0
    fi
    
    # Tentar reiniciar o bot
    pm2 restart $BOT_NAME
    restart_count=$((restart_count + 1))
    log "🔄 Bot reiniciado. Tentativa #$restart_count de $MAX_RESTART_ATTEMPTS"
  else
    # Bot está rodando, resetar contador
    if [ $restart_count -gt 0 ]; then
      log "✅ Bot está rodando normalmente. Resetando contador de reinícios."
      restart_count=0
    fi
  fi
  
  # Verificar uso de memória do processo
  memory_usage=$(pm2 show $BOT_NAME | grep "memory" | awk '{print $4}')
  if [[ $memory_usage == *"G"* ]]; then
    # Se estiver usando mais de 1 GB, reinicie
    memory_value=$(echo $memory_usage | sed 's/G//')
    if (( $(echo "$memory_value > 1.0" | bc -l) )); then
      log "⚠️ Uso de memória alto: $memory_usage. Reiniciando bot..."
      pm2 restart $BOT_NAME
      log "🔄 Bot reiniciado devido ao uso de memória."
    fi
  fi
  
  # Aguardar 1 minuto antes da próxima verificação
  sleep 60
done