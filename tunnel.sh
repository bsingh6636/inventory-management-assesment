#!/usr/bin/env bash
set -e

REMOTE_USER="azureuser"
REMOTE_HOST="52.172.93.106"
LOCAL_PORT="3306"
REMOTE_PORT="3306"

is_tunnel_running() {
  pgrep -f "ssh.*-L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" > /dev/null 2>&1
}

start_tunnel() {
  if is_tunnel_running; then
    echo "SSH tunnel is already running on port ${LOCAL_PORT}."
    status_tunnel
    return 0
  fi

  echo "Starting SSH tunnel to ${REMOTE_USER}@${REMOTE_HOST} (${LOCAL_PORT} -> 127.0.0.1:${REMOTE_PORT})..."
  ssh -f -N \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
    "${REMOTE_USER}@${REMOTE_HOST}"

  sleep 1
  if is_tunnel_running; then
    echo "SSH tunnel started successfully."
    status_tunnel
  else
    echo "Failed to start SSH tunnel."
    exit 1
  fi
}

stop_tunnel() {
  if is_tunnel_running; then
    echo "Stopping SSH tunnel..."
    pkill -f "ssh.*-L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" || true
    echo "SSH tunnel stopped."
  else
    echo "SSH tunnel is not running."
  fi
}

status_tunnel() {
  if is_tunnel_running; then
    local pid
    pid=$(pgrep -f "ssh.*-L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}")
    echo "Status: RUNNING (PID: ${pid})"
    if nc -z -v -w 2 127.0.0.1 "${LOCAL_PORT}" 2>/dev/null; then
      echo "Port ${LOCAL_PORT}: Open and reachable."
    else
      echo "Port ${LOCAL_PORT}: Tunnel process exists but port is not responding."
    fi
  else
    echo "Status: STOPPED"
  fi
}

case "$1" in
  start)
    start_tunnel
    ;;
  stop)
    stop_tunnel
    ;;
  restart)
    stop_tunnel
    start_tunnel
    ;;
  status|"")
    status_tunnel
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
