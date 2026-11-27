
pipeline {
    agent any

    environment {
        DOCKER_USER = 'irfanahmadbhat'
        IMAGE_TAG = 'v1.2'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Irfan-devops1/ShopSphere-Three-Tier-DevSecOps-Project.git'
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('SonarQube-Server') {
                    script {
                        def scanner = tool 'SonarScanner'
                        sh """
                            ${scanner}/bin/sonar-scanner \
                            -Dsonar.projectKey=shopsphere \
                            -Dsonar.projectName=ShopSphere \
                            -Dsonar.sources=application \
                            -Dsonar.exclusions="**/node_modules/**,**/dist/**"
                        """
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG -f application/frontend/Dockerfile application/frontend
                    docker build -t $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG -f application/catalog-service/Dockerfile application/catalog-service
                    docker build -t $DOCKER_USER/shopsphere-order:$IMAGE_TAG -f application/order-service/Dockerfile application/order-service
                    docker build -t $DOCKER_USER/shopsphere-payment:$IMAGE_TAG -f application/payment-service/Dockerfile application/payment-service
                '''
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-order:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-payment:$IMAGE_TAG
                '''
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_TOKEN'
                )]) {
                    sh '''
                        set -e
                        echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                        docker push $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG
                        docker push $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG
                        docker push $DOCKER_USER/shopsphere-order:$IMAGE_TAG
                        docker push $DOCKER_USER/shopsphere-payment:$IMAGE_TAG
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy ShopSphere') {
            steps {
                withCredentials([string(
                    credentialsId: 'shopsphere-db-password',
                    variable: 'DB_PASSWORD'
                )]) {
                    sh '''
                        set -eu
                        set +x
                        umask 077
                        trap 'rm -f .env' EXIT

                        printf 'DB_PASSWORD=%s\\n' "$DB_PASSWORD" > .env

                        docker compose config --quiet
                        docker compose pull
                        docker compose up -d --remove-orphans
                        docker compose ps
                    '''
                }
            }
        }
    }
}

