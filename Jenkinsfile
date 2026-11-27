
pipeline {
    agent any

    environment {
        DOCKER_USER = 'irfanahmadbhat'
        SKIP_PIPELINE = 'false'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Irfan-devops1/ShopSphere-Three-Tier-DevSecOps-Project.git'
            }
        }

        stage('Check Commit and Set Image Tag') {
            steps {
                script {
                    def commitMessage = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()

                    if (commitMessage.contains('[skip ci]')) {
                        env.SKIP_PIPELINE = 'true'
                        echo 'GitOps-only commit detected. Skipping CI pipeline.'
                    } else {
                        env.IMAGE_TAG = "build-${env.BUILD_NUMBER}"
                        echo "New Docker image tag: ${env.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('SonarQube Scan') {
            when {
                expression { env.SKIP_PIPELINE != 'true' }
            }
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
            when {
                expression { env.SKIP_PIPELINE != 'true' }
            }
            steps {
                sh '''
                    set -e
                    docker build -t $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG -f application/frontend/Dockerfile application/frontend
                    docker build -t $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG -f application/catalog-service/Dockerfile application/catalog-service
                    docker build -t $DOCKER_USER/shopsphere-order:$IMAGE_TAG -f application/order-service/Dockerfile application/order-service
                    docker build -t $DOCKER_USER/shopsphere-payment:$IMAGE_TAG -f application/payment-service/Dockerfile application/payment-service
                '''
            }
        }

        stage('Trivy Security Scan') {
            when {
                expression { env.SKIP_PIPELINE != 'true' }
            }
            steps {
                sh '''
                    set -e
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-order:$IMAGE_TAG
                    trivy image --severity HIGH,CRITICAL --exit-code 1 $DOCKER_USER/shopsphere-payment:$IMAGE_TAG
                '''
            }
        }

        stage('Push Images to Docker Hub') {
            when {
                expression { env.SKIP_PIPELINE != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_TOKEN'
                )]) {
                    sh '''
                        set +x
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

        stage('Update Helm Values and Push to GitHub') {
            when {
                expression { env.SKIP_PIPELINE != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-credentials',
                    usernameVariable: 'GH_USER',
                    passwordVariable: 'GH_TOKEN'
                )]) {
                    sh '''
                        set +x
                        set -eu

                        sed -i "s|^  frontend: .*|  frontend: $DOCKER_USER/shopsphere-frontend:$IMAGE_TAG|" helm/shopsphere/values.yaml
                        sed -i "s|^  catalog: .*|  catalog: $DOCKER_USER/shopsphere-catalog:$IMAGE_TAG|" helm/shopsphere/values.yaml
                        sed -i "s|^  order: .*|  order: $DOCKER_USER/shopsphere-order:$IMAGE_TAG|" helm/shopsphere/values.yaml
                        sed -i "s|^  payment: .*|  payment: $DOCKER_USER/shopsphere-payment:$IMAGE_TAG|" helm/shopsphere/values.yaml

                        git diff --check
                        git diff -- helm/shopsphere/values.yaml

                        git config user.name "Irfan Ahmad"
                        git config user.email "irfanhmd448@gmail.com"

                        git add helm/shopsphere/values.yaml
                        git commit -m "Update ShopSphere images to $IMAGE_TAG [skip ci]"

                        ASKPASS="$(mktemp)"
                        trap 'rm -f "$ASKPASS"' EXIT

                        cat > "$ASKPASS" <<'EOF'
#!/bin/sh
case "$1" in
    *Username*) printf '%s\\n' "$GH_USER" ;;
    *Password*) printf '%s\\n' "$GH_TOKEN" ;;
    *) exit 1 ;;
esac
EOF

                        chmod 700 "$ASKPASS"
                        export GIT_ASKPASS="$ASKPASS"
                        export GIT_TERMINAL_PROMPT=0

                        git push origin HEAD:main
                    '''
                }
            }
        }
    }
}

