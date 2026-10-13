# CI/CD Pipeline Automation System

![CI/CD](https://github.com/USERNAME/cognevance_cicd-pipeline-automation/actions/workflows/ci-cd.yml/badge.svg)
![AWS](https://img.shields.io/badge/AWS-ECR%20%2B%20ECS-orange)

**Cognevance Technologies | Cloud Computing & DevOps | Level 2 (Intermediate)**
**Author:** YOUR NAME | **AWS region:** `us-east-1` | **Live app:** `http://YOUR_ALB_DNS`

A complete AWS-native CI/CD pipeline that takes a web application from `git push` to a running ECS Fargate service: lint, test, build, scan, smoke-test, publish to Amazon ECR, deploy with Terraform, and verify through an Application Load Balancer.

---

## Table of contents
1. [Project overview](#1-project-overview)
2. [Pipeline architecture](#2-pipeline-architecture)
3. [Technology stack](#3-technology-stack)
4. [Repository structure](#4-repository-structure)
5. [The sample application](#5-the-sample-application)
6. [Run and test locally](#6-run-and-test-locally)
7. [Docker setup](#7-docker-setup)
8. [CI/CD pipeline explained](#8-cicd-pipeline-explained)
9. [Setup guide: secrets, registry and server](#9-setup-guide-secrets-registry-and-server)
10. [Deployment scripts](#10-deployment-scripts)
11. [Monitoring logs and deployment status](#11-monitoring-logs-and-deployment-status)
12. [Rollback strategy](#12-rollback-strategy)
13. [Security practices](#13-security-practices)
14. [Jenkins alternative](#14-jenkins-alternative)
15. [Troubleshooting](#15-troubleshooting)
16. [Task completion checklist](#16-task-completion-checklist)
17. [Deliverables](#17-deliverables)
18. [Screenshots](#18-screenshots)
19. [Setup checklist before submitting](#19-setup-checklist-before-submitting)
20. [Lessons learned and future improvements](#20-lessons-learned-and-future-improvements)

---

## 1. Project overview
| Item | Detail |
|---|---|
| Goal | Automate build, test and deployment of an application |
| App | Task Tracker (Node.js/Express REST API + web UI) |
| CI/CD | GitHub Actions (Jenkinsfile provided as alternative) |
| Containers | Docker multi-stage image, ECS Fargate |
| Registry | Amazon ECR |
| Target | Amazon ECS Fargate behind an Application Load Balancer |
| Observability | Structured JSON logs, health checks, job summaries, scheduled health monitor |

## 2. Pipeline architecture

```mermaid
flowchart LR
  Dev[Developer] -->|git push / PR| GH[(GitHub)]
  GH --> T[1. Lint + Test<br/>Node 18 and 20 matrix]
  T --> B[2. Build image<br/>Trivy scan<br/>container smoke test]
  B --> P[3. Push to Amazon ECR<br/>tag: commit SHA]
  P --> D[4. Terraform deploy]
  D --> S[(ECS Fargate service)]
  S --> H{Healthy?}
  H -- yes --> OK[Success + summary]
  H -- no --> RB[Automatic rollback to previous image]
  M[Scheduled health monitor] -.-> S
```

Pull requests run stages 1 and 2 only. Pushes to `main` run all four stages.

## 3. Technology stack
| Area | Tool |
|---|---|
| Application | Node.js 20, Express |
| Testing | Node built-in test runner with coverage |
| CI/CD | GitHub Actions (also Jenkins) |
| Containers | Docker, multi-stage build, Docker Compose |
| Registry | Amazon ECR |
| Security scan | Trivy |
| Deployment | Terraform + ECS Fargate |
| Monitoring | Docker health checks, JSON logs, GitHub job summaries |

## 4. Repository structure
```
cognevance_cicd-pipeline-automation/
├── app/
│   ├── src/app.js, server.js     # Express API, logging, graceful shutdown
│   ├── public/                   # Web UI (HTML, CSS, JS)
│   ├── test/app.test.js          # 6 automated tests
│   └── package.json
├── Dockerfile                    # Multi-stage, non-root, healthcheck
├── docker-compose.yml            # Server deployment (hardened)
├── docker-compose.dev.yml        # Local build and run
├── scripts/
│   ├── deploy.sh                 # Legacy local Docker deployment helper
│   ├── rollback.sh               # Legacy local Docker rollback helper
│   ├── status.sh                 # Deployment status
│   ├── logs.sh                   # follow / errors / slow / last N
│   ├── smoke-test.sh             # End-to-end API check
│   └── server-setup.sh           # One-time Docker install on server
├── .github/workflows/
│   ├── ci-cd.yml                 # Main pipeline
│   └── health-monitor.yml        # Scheduled production health check
├── jenkins/Jenkinsfile           # Alternative pipeline
├── docs/REPORT.md, docs/screenshots/
└── README.md, LICENSE, .gitignore, .dockerignore
```

## 5. The sample application
**Task Tracker**: add, complete and delete tasks through a responsive web UI or REST API.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Liveness check used by Docker and monitors |
| GET | `/version` | Version, commit SHA and build date baked in at build time |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task `{ "title": "..." }` |
| PATCH | `/api/tasks/:id` | Mark done `{ "done": true }` |
| DELETE | `/api/tasks/:id` | Delete task |

Design points relevant to CI/CD: input validation, JSON structured logs, graceful shutdown on `SIGTERM` (so redeploys do not drop requests), `/version` so you can prove which commit is running. Data is held in memory, which keeps the demo simple; use a database for real workloads.

## 6. Run and test locally
```bash
git clone https://github.com/USERNAME/cognevance_cicd-pipeline-automation.git
cd cognevance_cicd-pipeline-automation

# Tests
cd app && npm install && npm test && cd ..

# Run without Docker
cd app && npm start            # http://localhost:3000

# Run with Docker
docker compose -f docker-compose.dev.yml up --build
./scripts/smoke-test.sh http://localhost:3000
```

## 7. Docker setup
- **Multi-stage build:** stage 1 installs production dependencies, stage 2 copies only what is needed, giving a small image.
- **Non-root user** (`USER node`) and no dev dependencies or test files in the image.
- **Build arguments** `APP_VERSION`, `GIT_SHA`, `BUILD_DATE` are stored as image labels and exposed on `/version`.
- **HEALTHCHECK** calls `/health` every 15 seconds; ECS and the ALB use the same endpoint.
- **Compose hardening:** read-only filesystem, all Linux capabilities dropped, `no-new-privileges`, log rotation (10 MB x 5 files), `restart: unless-stopped`.

Manual build and push to ECR:
```bash
docker build -t task-tracker:1.0.0 --build-arg GIT_SHA=$(git rev-parse HEAD) .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker tag task-tracker:1.0.0 "$ECR_REGISTRY/task-tracker:1.0.0"
docker push "$ECR_REGISTRY/task-tracker:1.0.0"
```

## 8. CI/CD pipeline explained
File: `.github/workflows/ci-cd.yml`

| Stage | Job | What happens |
|---|---|---|
| 1 | `test` | Runs on Node 18 and 20 (matrix): install, syntax lint, 6 tests with coverage, results written to the job summary |
| 2 | `build` | Builds the image (with layer cache), scans with Trivy for HIGH/CRITICAL CVEs, starts the container and runs `smoke-test.sh` against it |
| 3 | `publish` | Pushes the commit-tagged image to Amazon ECR and applies the ECS Fargate Terraform stack |
| 4 | `deploy` | Runs the smoke test against the ECS Application Load Balancer |

Triggers: push to `main`, tags `v*`, pull requests (stages 1-2), manual run.
Stage 4 is protected by the `production` environment (add required reviewers for manual approval) and only runs when repository variable `DEPLOY_ENABLED=true`.

## 9. Setup guide: AWS, secrets and infrastructure

### 9.1 AWS infrastructure
1. Install AWS CLI and Terraform, configure an administrator profile, and choose a region.
2. Bootstrap the stack:
   ```bash
   cd infra
   terraform init
   terraform apply -var='github_repository=YOUR_GITHUB_OWNER/cognevance_Task2' -var='image_uri=bootstrap'
   ```
3. Save `github_actions_role_arn` as the GitHub secret `AWS_GITHUB_ACTIONS_ROLE_ARN`.
4. Save `load_balancer_url` as the GitHub secret `AWS_APP_URL`.
5. Set the repository variable `AWS_REGION` and set `DEPLOY_ENABLED=true`.

Terraform creates the VPC, public subnets, security groups, ECR repository, ECS cluster/service, Application Load Balancer, CloudWatch log group, and GitHub OIDC role. GitHub Actions does not use SSH keys or long-lived AWS access keys.

### 9.3 GitHub secrets and variables
Settings > Secrets and variables > Actions

| Type | Name | Value |
|---|---|---|
| Secret | `AWS_GITHUB_ACTIONS_ROLE_ARN` | Terraform output `github_actions_role_arn` |
| Secret | `AWS_APP_URL` | Terraform output `load_balancer_url` |
| Variable | `AWS_REGION` | AWS region, for example `us-east-1` |
| Variable | `DEPLOY_ENABLED` | `true` |

Also create an Environment named `production` (Settings > Environments); optionally add yourself as required reviewer.

### 9.4 First run
```bash
git add . && git commit -m "feat: initial CI/CD pipeline" && git push origin main
```
Watch **Actions**, then open the ALB URL.

## 10. Deployment scripts
| Script | Purpose |
|---|---|
| `scripts/deploy.sh` | Legacy local Docker Compose helper; production deploys use Terraform and ECS |
| `scripts/rollback.sh` | Legacy local rollback helper; production rollback uses an earlier ECR tag |
| `scripts/status.sh` | Container state, health, deployed image, `/version`, last logs |
| `scripts/logs.sh` | `follow`, `errors`, `slow`, `last N` |
| `scripts/smoke-test.sh` | Creates, lists and deletes a task through the API to prove the deployment works |
| `scripts/server-setup.sh` | One-time Docker installation |

## 11. Monitoring logs and deployment status
**Pipeline status**
- Actions tab shows every stage; the badge at the top of this README shows the latest result.
- Each run has a **job summary** (test results, published tags, deployed image and URL).
- Failed runs send GitHub's notification email.

**Application logs** (JSON, one event per line)
```json
{"time":"2026-10-13T03:16:09.834Z","level":"info","method":"POST","path":"/api/tasks","status":201,"ms":2}
```
```bash
./scripts/logs.sh follow     # live tail
./scripts/logs.sh errors     # 5xx and error-level events
./scripts/logs.sh slow       # requests slower than 100 ms
docker logs --since 10m task-tracker
```
Logs are rotated by Docker (10 MB x 5 files) so the disk cannot fill up.

**Deployment status**
```bash
./scripts/status.sh
docker ps    # STATUS column shows "healthy"
curl http://SERVER_IP/version
```

**Continuous health monitoring:** `health-monitor.yml` checks `/health` and `/version` on the ECS Application Load Balancer every 30 minutes and fails if the app is unreachable.

## 12. Rollback strategy
- **Automatic:** ECS replaces tasks that fail container or load balancer health checks.
- **Manual:** update `infra` with an earlier ECR image tag and run `terraform apply`.

## 13. Security practices
| Practice | Implementation |
|---|---|
| No secrets in code | All credentials in GitHub Secrets; `.env` ignored |
| Least privilege workflow | `permissions: contents: read` |
| Image hardening | Non-root user, minimal Alpine base, multi-stage, read-only filesystem, dropped capabilities |
| Vulnerability scanning | Trivy on every build (set `exit-code: "1"` to block on findings) |
| Short-lived AWS credentials | GitHub Actions uses AWS OIDC; no long-lived access key or SSH key is stored |
| Production approval | Optional required reviewers on the `production` environment |
| IAM scope | The deployment role is limited to ECR push, ECS deployment, and the task execution role |

## 14. Jenkins alternative
`jenkins/Jenkinsfile` is retained as an alternative for teams that already operate Jenkins. GitHub Actions with OIDC is the recommended pipeline.

## 15. Troubleshooting
| Problem | Fix |
|---|---|
| ECR push is denied | Check the AWS role trust policy, region, and ECR permissions |
| Deploy job skipped | Set repository variable `DEPLOY_ENABLED=true`; only runs on `main` |
| Site unreachable | Check ALB target health and ECS service events in AWS |
| Deployment failed | Inspect the `/ecs/task-tracker` CloudWatch log group and ECS service events |
| Trivy reports vulnerabilities | Update the base image tag or dependencies; they are informational by default |

## 16. Task completion checklist
| # | Task | Status | Where |
|---|---|---|---|
| 1 | Sample web application | Done | `app/` |
| 2 | GitHub Actions / Jenkins pipeline | Done (both provided) | `.github/workflows/`, `jenkins/` |
| 3 | Automated build and testing | Done | stages 1-2 in `ci-cd.yml` |
| 4 | Deploy with AWS containers | Done | `infra/`, `.github/workflows/ci-cd.yml` |
| 5 | Amazon ECR integration | Done; **you bootstrap the AWS role and configure GitHub secrets** | stage 3, section 9.1 |
| 6 | Monitor logs and deployment status | Done | Section 11 |
| 7 | Document CI/CD workflow | Done | This README, `docs/REPORT.md` |

## 17. Deliverables
| Deliverable | Location |
|---|---|
| CI/CD pipeline configuration | `.github/workflows/ci-cd.yml`, `health-monitor.yml`, `jenkins/Jenkinsfile` |
| Docker files | `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `.dockerignore` |
| Deployment scripts | `scripts/` |
| Pipeline screenshots | `docs/screenshots/` |
| Project documentation | This README, `docs/REPORT.md` |
| GitHub repository link | https://github.com/USERNAME/cognevance_cicd-pipeline-automation |

## 18. Screenshots
Save with these names in `docs/screenshots/`:

| # | File | Shows |
|---|---|---|
| 1 | `01-app-ui.png` | Running app in the browser with version in footer |
| 2 | `02-tests-passing.png` | Local or Actions test output |
| 3 | `03-pipeline-success.png` | Actions run graph, all stages green |
| 4 | `04-test-summary.png` | Job summary with test results |
| 5 | `05-ecr.png` | Amazon ECR repository with tags |
| 6 | `06-trivy-scan.png` | Scan step output |
| 7 | `07-deploy-log.png` | Deploy job log showing health check success |
| 8 | `08-docker-ps.png` | `docker ps` on server showing `healthy` |
| 9 | `09-status-script.png` | Output of `./scripts/status.sh` |
| 10 | `10-logs.png` | `./scripts/logs.sh follow` JSON logs |
| 11 | `11-rollback.png` | Failed deploy rolling back (see below) |
| 12 | `12-secrets-list.png` | Secrets page (names only, no values) |

**Demonstrating rollback (good evidence):** push a commit that breaks `/health` (for example return status 500), let the pipeline deploy it, and screenshot the log showing "Deployment FAILED ... Rolling back". Then revert the commit.

## 19. Setup checklist before submitting
- [ ] Replace `YOUR NAME`, `USERNAME`, and `YOUR_ALB_DNS`
- [ ] AWS role and ECR/ECS infrastructure bootstrapped with Terraform
- [ ] GitHub OIDC secret and ALB URL configured; pipeline green
- [ ] `DEPLOY_ENABLED=true`; app reachable through the ALB
- [ ] Screenshots added; `docs/REPORT.md` completed
- [ ] Email repo link, AWS deployment URL and your experience/review to support@cognevance.online

## 20. Lessons learned and future improvements
- Building and smoke-testing the image *before* pushing prevents broken images reaching the registry.
- Health-check-gated deployment with rollback turns deployments from risky events into routine ones.
- Future work: blue/green or canary releases, Terraform-provisioned servers, Prometheus metrics and Grafana, Slack/Telegram alerts, signed images (cosign), database-backed storage.

## License
MIT. See [LICENSE](LICENSE).
