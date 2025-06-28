#!/bin/bash
cd /home/kavia/workspace/code-generation/tictactrack-61694-3df78303/tic_tac_toe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

