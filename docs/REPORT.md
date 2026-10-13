# Project Report: CI/CD Pipeline Automation System

| | |
|---|---|
| Name | YOUR NAME |
| Organisation | Cognevance Technologies |
| Domain / Level | Cloud Computing & DevOps, Level 2 (Intermediate) |
| Date | DD Month 2026 |
| Repository | https://github.com/USERNAME/cognevance_cicd-pipeline-automation |
| AWS deployment | Amazon ECR + ECS Fargate |

## 1. Introduction
Manual build and deployment is slow and error-prone. This project automates the full path from source code to a running container using CI/CD, so every change is tested, packaged, published and deployed consistently.

## 2. Objectives
Create a sample web app; configure a pipeline; automate build and test; deploy with Docker; integrate a container registry; monitor logs and status; document the workflow.

## 3. Tools and technologies
Node.js, Express, Docker, GitHub Actions, Jenkins (alternative), Amazon ECR, ECS Fargate, Terraform, Trivy, Bash, CloudWatch.

## 4. Implementation
### 4.1 Application
(Describe Task Tracker, its API, tests, logging and health endpoints. See README sections 5.)

### 4.2 Pipeline
(Explain the four stages and triggers in your own words. See README section 8.)

### 4.3 Docker
(Explain the multi-stage Dockerfile, non-root user, health check, Compose hardening.)

### 4.4 Registry
(Amazon ECR repository and commit-SHA image tagging strategy.)

### 4.5 Deployment and rollback
(Describe the ECS service, ALB health checks, CloudWatch logs, and ECR-tag rollback.)

### 4.6 Monitoring
(Pipeline status, job summaries, JSON logs, `status.sh`, health monitor workflow.)

## 5. Results
| Metric | Result |
|---|---|
| Automated tests | 6 passed, coverage ___% |
| Pipeline duration (push to deployed) | ___ min |
| Image size | ___ MB |
| Vulnerabilities (HIGH/CRITICAL) | ___ |
| Rollback test | Succeeded / not tested |

## 6. Challenges and solutions
| Challenge | Solution |
|---|---|
| (e.g. ECR permission denied) | (e.g. corrected the GitHub OIDC role trust policy) |
| (e.g. ECS task failed health checks) | (e.g. inspected CloudWatch logs and service events) |

## 7. Conclusion
(2-4 sentences.)

## 8. Future improvements
Blue/green deployments, Prometheus and Grafana, Slack alerts, image signing, database persistence.

## 9. Experience, review and suggestions
(Short honest paragraph for Cognevance.)
