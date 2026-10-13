variable "aws_region" {
  description = "AWS region for the deployment."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used in AWS resource names."
  type        = string
  default     = "task-tracker"
}

variable "github_repository" {
  description = "GitHub repository in owner/name form allowed to assume the deployment role."
  type        = string
}

variable "image_uri" {
  description = "Fully qualified ECR image URI used by the ECS task definition."
  type        = string
}
