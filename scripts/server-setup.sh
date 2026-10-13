#!/usr/bin/env bash
# One-time setup for an Ubuntu server (e.g. AWS EC2 t2.micro): installs Docker and prepares the app directory.
set -euo pipefail
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
mkdir -p ~/task-tracker
echo "Done. Log out and back in, then copy docker-compose.yml and scripts/ to ~/task-tracker (the pipeline does this for you)."
