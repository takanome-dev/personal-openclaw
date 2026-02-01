#!/bin/bash
# OpenClaw logging helper
# Source this in your shell or use it directly

export CLAW_SESSION="${CLAW_SESSION:-session-$(date +%s)}"
export CLAW_LABEL="${CLAW_LABEL:-Main Session}"
export CLAW_CHANNEL="${CLAW_CHANNEL:-discord}"

OPENCLAW_DIR="/Users/takanome/Developer/perso/openclaw"

# Quick log function
clawlog() {
  local type="$1"
  local action="$2"
  shift 2
  
  if [[ -z "$type" || -z "$action" ]]; then
    echo "Usage: clawlog <type> <action> [key=value...]"
    echo ""
    echo "Types: tool_call, tool_result, file_access, exec_command, browser_action,"
    echo "       message_received, message_sent, reasoning, session_start, session_end"
    return 1
  fi
  
  node "$OPENCLAW_DIR/log.js" "$type" "$action" "$@"
}

# Convenience shortcuts
clawtool() { clawlog tool_call "$1" tool="$2" "${@:3}"; }
clawfile() { clawlog file_access "${2}: $1" path="$1" "${@:3}"; }
clawexec() { clawlog exec_command "$1" command="$1" "${@:2}"; }
clawbrowser() { clawlog browser_action "$1" url="$2" "${@:3}"; }
clawmsg() { 
  if [[ "$1" == "in" ]]; then
    clawlog message_received "$2" "${@:3}"
  else
    clawlog message_sent "$2" "${@:3}"
  fi
}
clawthink() { clawlog reasoning "$1"; }

echo "🍊 OpenClaw logging loaded"
echo "   Session: $CLAW_SESSION"
echo "   Label: $CLAW_LABEL"
echo "   Channel: $CLAW_CHANNEL"
echo ""
echo "Commands: clawlog, clawtool, clawfile, clawexec, clawbrowser, clawmsg, clawthink"
