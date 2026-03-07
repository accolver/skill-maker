output "projects" {
  description = "Map of project IDs created by the factory."
  value       = module.project-factory.projects
}

output "service_accounts" {
  description = "Map of service accounts created by the factory."
  value       = module.project-factory.service_accounts
}
