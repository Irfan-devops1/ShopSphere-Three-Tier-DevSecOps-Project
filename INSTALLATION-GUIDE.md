# ShopSphere – Installation and Deployment Guide

This guide covers the installation and configuration of the tools required to reproduce the ShopSphere DevSecOps project.

## 1. Infrastructure Requirements

Recommended lab infrastructure:

| Component | Suggested Configuration |
|---|---|
| Operating System | Ubuntu 24.04 LTS |
| CPU | 4 vCPU |
| RAM | 8 GB or more for the combined lab |
| Storage | 30 GB or more |
| Cloud | AWS EC2 |
| Source Code | GitHub |

For a distributed setup, Jenkins/SonarQube and the Kubernetes application environment can run on separate EC2 instances.

**Important:** Running all tools on one small EC2 instance may cause memory and CPU constraints. Monitor AWS costs and terminate unused resources.

## 2. Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git unzip vim ca-certificates gnupg lsb-release apt-transport-https
```

## 3. Install Docker

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Apply group membership by reconnecting to SSH or running:

```bash
newgrp docker
```

Verify:

```bash
docker --version
docker ps
```

## 4. Install Docker Compose

```bash
sudo apt install -y docker-compose-v2
```

Verify:

```bash
docker compose version
```

## 5. Install Java

Jenkins requires Java 17 or a supported newer version.

```bash
sudo apt install -y fontconfig openjdk-17-jdk
```

Verify:

```bash
java -version
```

## 6. Install Jenkins

Add the Jenkins repository:

```bash
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
```

```bash
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
```

Install and start Jenkins:

```bash
sudo apt update
sudo apt install -y jenkins
sudo systemctl enable --now jenkins
```

Get the initial password:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open:

```text
http://YOUR-JENKINS-PUBLIC-IP:8080
```

Allow TCP port 8080 in the EC2 security group, preferably restricted to your IP.

Install the required Jenkins plugins, including:

- Pipeline
- Git
- GitHub Integration
- Docker Pipeline
- Credentials Binding
- SonarQube Scanner
- Kubernetes CLI

Give the Jenkins service access to Docker:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

## 7. Install SonarQube

For a lab installation using Docker:

```bash
sudo sysctl -w vm.max_map_count=524288
```

```bash
docker run -d \
  --name sonarqube \
  --restart unless-stopped \
  -p 9000:9000 \
  sonarqube:community
```

Access:

```text
http://YOUR-SONARQUBE-PUBLIC-IP:9000
```

Complete the initial login and configure the SonarQube project and token.

For production, use persistent storage, appropriate memory allocation, and a supported database configuration.

## 8. Install Trivy

```bash
sudo apt-get install -y wget apt-transport-https gnupg
```

```bash
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
```

```bash
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | \
sudo tee /etc/apt/sources.list.d/trivy.list
```

```bash
sudo apt update
sudo apt install -y trivy
```

Verify:

```bash
trivy --version
```

Example image scan:

```bash
trivy image --severity HIGH,CRITICAL irfanahmadbhat/shopsphere-frontend:v1.2
```

## 9. Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
```

```bash
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

Verify:

```bash
kubectl version --client
```

## 10. Install Kind

```bash
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
```

```bash
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

Create a cluster:

```bash
kind create cluster --name shopsphere
```

Verify:

```bash
kubectl cluster-info --context kind-shopsphere
kubectl get nodes
```

## 11. Install Helm

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
```

```bash
chmod 700 get_helm.sh
./get_helm.sh
```

Verify:

```bash
helm version
```

## 12. Install Argo CD

Create its namespace:

```bash
kubectl create namespace argocd
```

Install Argo CD:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Check:

```bash
kubectl get pods -n argocd
```

Expose Argo CD locally using port forwarding:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open:

```text
https://localhost:8080
```

Retrieve the initial administrator password:

```bash
kubectl get secret argocd-initial-admin-secret -n argocd \
-o jsonpath="{.data.password}" | base64 -d
```

## 13. Install Prometheus and Grafana

Add the Helm repository:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Create the monitoring namespace:

```bash
kubectl create namespace monitoring
```

Install the monitoring stack:

```bash
helm install monitoring prometheus-community/kube-prometheus-stack \
-n monitoring
```

Check:

```bash
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

Forward Grafana:

```bash
kubectl port-forward svc/monitoring-grafana -n monitoring 3000:80
```

Open:

```text
http://localhost:3000
```

Get the Grafana admin password:

```bash
kubectl get secret monitoring-grafana -n monitoring \
-o jsonpath="{.data.admin-password}" | base64 -d
```

Forward Prometheus:

```bash
kubectl port-forward svc/monitoring-kube-prometheus-prometheus \
-n monitoring 9090:9090
```

Open:

```text
http://localhost:9090
```

## 14. Clone the ShopSphere Repository

```bash
git clone https://github.com/Irfan-devops1/ShopSphere-Three-Tier-DevSecOps-Project.git
```

```bash
cd ShopSphere-Three-Tier-DevSecOps-Project
```

Review the repository:

```bash
ls -la
```

## 15. Configure Docker Hub Credentials

Authenticate with Docker Hub:

```bash
docker login
```

Use your Docker Hub username and access token.

The project images are:

```text
irfanahmadbhat/shopsphere-frontend:v1.2
irfanahmadbhat/shopsphere-catalog:v1.2
irfanahmadbhat/shopsphere-order:v1.2
irfanahmadbhat/shopsphere-payment:v1.2
```

## 16. Run ShopSphere Using Docker Compose

Create a `.env` file:

```bash
vim .env
```

Add:

```env
DB_PASSWORD=CHANGE_THIS_TO_A_STRONG_PASSWORD
```

Secure the file:

```bash
chmod 600 .env
```

Validate the Compose configuration:

```bash
docker compose config --quiet
```

Start the application:

```bash
docker compose up -d
```

Check containers:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs --tail=100
```

Access:

```text
http://YOUR-EC2-PUBLIC-IP:4173
```

Allow inbound TCP port 4173 in the EC2 security group, restricted to your IP where possible.

## 17. Deploy Using Helm on Kubernetes

Check the Helm chart:

```bash
ls -R helm/shopsphere
```

Validate:

```bash
helm lint helm/shopsphere
```

Install:

```bash
helm upgrade --install shopsphere helm/shopsphere \
-n shopsphere --create-namespace
```

Check:

```bash
kubectl get pods -n shopsphere
kubectl get svc -n shopsphere
kubectl get deployments -n shopsphere
```

The actual chart values, storage configuration, and Kubernetes networking must match the target cluster.

## 18. Verify Deployment

```bash
kubectl get nodes
kubectl get pods -A
kubectl get svc -A
```

Check Argo CD:

```bash
kubectl get applications -n argocd
```

Check monitoring:

```bash
kubectl get pods -n monitoring
```

## 19. Stop the Application and Clean Up

Stop Docker Compose containers:

```bash
docker compose down
```

This preserves named database volumes.

To remove the database volume as well (destructive):

```bash
docker compose down -v
```

Delete the Kind cluster:

```bash
kind delete cluster --name shopsphere
```

Stop unnecessary EC2 resources to avoid ongoing AWS charges.

---

## Important Notes

- Keep credentials, API tokens, passwords, and private keys out of GitHub.
- Use Jenkins credentials rather than hardcoding secrets in the Jenkinsfile.
- Restrict public access to administrative interfaces.
- Review vulnerability scan results before deploying images.
- The demonstrated ShopSphere Kubernetes deployment used Kind on AWS EC2. EKS deployment requires a separately configured EKS cluster and AWS permissions.
- Commands and package versions can change over time. Check official documentation when installing newer versions.

## Project Links

- GitHub Repository: https://github.com/Irfan-devops1/ShopSphere-Three-Tier-DevSecOps-Project
- GitHub Profile: https://github.com/Irfan-devops1
- LinkedIn: https://linkedin.com/in/irfan-ahmad-1b52098b
