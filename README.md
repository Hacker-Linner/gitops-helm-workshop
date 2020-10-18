# Kubernetes 的渐进式交付

[Kubernetes 的渐进式交付](https://helm-workshop.hacker-linner.com/)

# gitops-helm-workshop

Sessions:

- [Helm Summit EU 2019](https://events.linuxfoundation.org/events/helm-summit-2019/)

# Docker

```sh
mkdir -p /data/nfs/nginx-static/helm-workshop
chmod -R 777 /data/nfs/nginx-static/helm-workshop
docker build -t registry.cn-shenzhen.aliyuncs.com/hacker-linner/helm-workshop:ci .
docker push registry.cn-shenzhen.aliyuncs.com/hacker-linner/helm-workshop:ci

git checkout -b release/cloud
```
