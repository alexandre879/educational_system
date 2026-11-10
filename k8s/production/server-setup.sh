#!/usr/bin/env bash
# One-time setup of the DigitalOcean server (Ubuntu 24.04, 4 GB, 2 CPUs) that hosts educational_system and ppops
# on k3s. Safe to run again. Run it from your Mac:
#
#   ssh -i ~/.ssh/digitalocean_ed25519 root@209.38.108.180 'bash -s' < k8s/production/server-setup.sh
set -euo pipefail

# 2 GB of swap: room for memory spikes, mostly while images are being built.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q --system

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
# docker-buildx: BuildKit skips Dockerfile stages a build doesn't need (e.g. ppops' dev stage).
apt-get install -y -q docker.io docker-buildx rsync

# Keep container logs from filling the disk.
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl enable docker
systemctl restart docker

# k3s on Docker, so images built on this server are usable straight away (no registry to pay for).
# metrics-server is left out to save memory.
if ! command -v k3s >/dev/null; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--docker --disable metrics-server --write-kubeconfig-mode 600" sh -
fi

# Traefik, k3s's built-in ingress: free Let's Encrypt certificates and HTTP -> HTTPS redirects.
mkdir -p /var/lib/rancher/k3s/server/manifests
cat > /var/lib/rancher/k3s/server/manifests/traefik-config.yaml <<'EOF'
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    additionalArguments:
      - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    persistence:
      enabled: true
      size: 128Mi
    podSecurityContext:
      fsGroup: 65532
      fsGroupChangePolicy: OnRootMismatch
    ports:
      web:
        http:
          redirections:
            entryPoint:
              to: websecure
              scheme: https
              permanent: true
    resources:
      requests:
        cpu: 50m
        memory: 48Mi
      limits:
        memory: 160Mi
EOF

echo "k3s: $(k3s --version | head -1)"
