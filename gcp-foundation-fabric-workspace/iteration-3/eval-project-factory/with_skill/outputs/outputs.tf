# Outputs for the project factory
# IMPORTANT: Always add depends_on to outputs referencing module resources

output "project_ids" {
  description = "Map of project name to project ID for all factory-created projects."
  value       = module.project-factory.project_ids
  depends_on  = [module.project-factory]
}

output "project_numbers" {
  description = "Map of project name to project number for all factory-created projects."
  value       = module.project-factory.project_numbers
  depends_on  = [module.project-factory]
}

output "service_accounts" {
  description = "Map of project name to default service account email."
  value       = module.project-factory.service_accounts
  depends_on  = [module.project-factory]
}
