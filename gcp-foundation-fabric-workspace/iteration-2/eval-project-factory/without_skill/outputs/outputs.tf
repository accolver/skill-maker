# =============================================================================
# Outputs from the Project Factory
# =============================================================================

output "projects" {
  description = "Created projects with their attributes."
  value       = module.project-factory.projects
}

output "service_accounts" {
  description = "Service accounts created by the factory."
  value       = module.project-factory.service_accounts
}

output "buckets" {
  description = "GCS buckets created by the factory."
  value       = module.project-factory.buckets
}

output "folders" {
  description = "Folder hierarchy created by the factory."
  value       = module.project-factory.folders
}
