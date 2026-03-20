# MedTech Solutions -- HIPAA & Regulatory Compliance Checklist for AI Implementation

**Purpose:** Ensure all AI modernization activities comply with HIPAA, state regulations, and healthcare industry standards. This checklist should be reviewed at each phase gate.

---

## 1. Pre-Engagement Compliance Setup

### Legal Agreements
- [ ] Mutual NDA executed before any PHI discussion
- [ ] Business Associate Agreement (BAA) executed between MedTech and consulting firm
- [ ] BAA template reviewed for AI-specific provisions (model training, data retention, de-identification)
- [ ] Subcontractor BAAs identified for any third-party tools or cloud services
- [ ] Engagement agreement includes data handling, breach notification, and termination provisions

### Team Compliance
- [ ] All consulting team members have current HIPAA training certificates
- [ ] All team members have signed confidentiality agreements
- [ ] Background checks completed for team members accessing PHI
- [ ] Minimum necessary access principle documented for each team role
- [ ] Secure communication channels established (encrypted email, secure file sharing)

---

## 2. Discovery Phase Compliance

### Data Handling During Assessment
- [ ] No PHI copied to consultant systems without BAA and security controls
- [ ] Screenshots and documentation anonymized/de-identified
- [ ] Clinic observation notes do not contain patient identifiers
- [ ] Interview recordings (if any) stored on encrypted, access-controlled systems
- [ ] Network diagrams and system inventories marked confidential

### Current-State HIPAA Assessment
- [ ] Review MedTech's most recent HIPAA risk assessment
- [ ] Identify current Privacy Officer and Security Officer
- [ ] Review existing policies: Privacy, Security, Breach Notification
- [ ] Assess current PHI data flows and document findings
- [ ] Identify any existing compliance gaps relevant to AI implementation
- [ ] Review current BAA inventory for existing vendors
- [ ] Assess employee HIPAA training program and frequency
- [ ] Review incident/breach history (past 3 years)

---

## 3. AI System Design Compliance

### Privacy by Design Principles
- [ ] Each AI use case has a documented PHI impact assessment
- [ ] Data minimization: Only collect/process PHI necessary for the specific AI function
- [ ] Purpose limitation: PHI used only for stated, consented purposes
- [ ] De-identification strategy defined for each AI/ML use case (Safe Harbor or Expert Determination)
- [ ] Re-identification risk assessment completed for de-identified datasets
- [ ] Patient consent requirements documented for each AI application
- [ ] Transparency: Patients informed about AI use in their care (where applicable)

### Technical Safeguards for AI Systems
- [ ] Encryption at rest (AES-256 minimum) for all PHI-containing data stores
- [ ] Encryption in transit (TLS 1.2+ minimum) for all PHI data flows
- [ ] Access controls: Role-based access with least privilege for all AI systems
- [ ] Audit logging: All PHI access logged with user, timestamp, action, and data accessed
- [ ] Automatic session timeout on all PHI-accessible systems
- [ ] Multi-factor authentication for all systems processing PHI
- [ ] Network segmentation: AI systems in isolated network segments
- [ ] Data loss prevention (DLP) controls on AI system outputs

### AI-Specific Compliance Considerations
- [ ] ML model training data: De-identified or under explicit consent/authorization
- [ ] Model explainability: Clinical AI systems can explain their outputs for patient/provider review
- [ ] Human-in-the-loop: All clinical AI recommendations require human review and approval
- [ ] Model bias testing: Fairness assessments across demographic groups
- [ ] Model versioning: All model versions tracked with training data lineage
- [ ] Model performance monitoring: Ongoing accuracy and drift detection
- [ ] AI vendor assessment: Each AI vendor evaluated for HIPAA compliance and BAA execution

---

## 4. Cloud & Infrastructure Compliance

### AWS HIPAA Compliance
- [ ] AWS BAA executed between MedTech and AWS
- [ ] Only HIPAA-eligible AWS services used for PHI workloads
- [ ] AWS HIPAA-eligible services confirmed for each deployment:
  - [ ] EC2, ECS, EKS (compute)
  - [ ] S3 (storage -- encryption enabled, bucket policies, versioning)
  - [ ] RDS, DynamoDB (databases -- encryption, access controls)
  - [ ] SageMaker (ML -- if used for PHI-containing models)
  - [ ] Comprehend Medical (NLP -- HIPAA eligible)
  - [ ] Textract (OCR -- verify HIPAA eligibility for specific use)
  - [ ] Lambda (serverless -- HIPAA eligible)
  - [ ] CloudTrail, CloudWatch (logging and monitoring)
- [ ] VPC configuration with private subnets for PHI workloads
- [ ] AWS CloudTrail enabled for all API activity logging
- [ ] AWS Config rules for compliance monitoring
- [ ] S3 bucket policies prevent public access
- [ ] KMS key management for encryption keys

### On-Premises Compliance (Hybrid Considerations)
- [ ] Data flow between on-prem and cloud documented and secured
- [ ] VPN or Direct Connect with encryption for on-prem to AWS communication
- [ ] Consistent access controls across hybrid environment
- [ ] Unified audit logging across on-prem and cloud
- [ ] Backup and disaster recovery plan covers both environments

---

## 5. Vendor & Third-Party Compliance

### AI Vendor Evaluation Checklist
For each AI vendor or service provider:
- [ ] HIPAA compliance attestation or certification
- [ ] BAA executed
- [ ] SOC 2 Type II report reviewed (current year)
- [ ] Data handling practices documented:
  - [ ] Where is data stored? (geography, data center)
  - [ ] Who has access to data?
  - [ ] How long is data retained?
  - [ ] How is data deleted upon termination?
  - [ ] Is data used for vendor's model training? (must be prohibited for PHI)
- [ ] Breach notification procedures documented
- [ ] Security assessment or penetration test results reviewed
- [ ] Data portability and export capabilities confirmed
- [ ] Termination and data destruction procedures documented

### Specific Vendor Categories
- [ ] EHR vendor: Integration approach reviewed for PHI exposure
- [ ] Cloud AI services (AWS, Google, etc.): BAA and eligible services confirmed
- [ ] Third-party AI models/APIs: Data handling for API calls documented
- [ ] Communication platforms (SMS, email): BAA and encryption confirmed
- [ ] Analytics/BI tools: PHI access controls and logging verified

---

## 6. Implementation Phase Compliance

### Development Practices
- [ ] No PHI in development/test environments (use synthetic data)
- [ ] Synthetic data generation strategy documented
- [ ] Code repositories do not contain PHI, credentials, or encryption keys
- [ ] Security testing (SAST, DAST) included in CI/CD pipeline
- [ ] Peer code review for all PHI-handling components
- [ ] Dependency scanning for known vulnerabilities

### Testing & Validation
- [ ] User Acceptance Testing uses de-identified or synthetic data
- [ ] Penetration testing conducted before go-live
- [ ] Vulnerability assessment completed and remediated
- [ ] Access control testing: Verify least privilege enforcement
- [ ] Audit log testing: Verify completeness and accuracy
- [ ] Encryption verification: At-rest and in-transit confirmed
- [ ] Disaster recovery testing completed

### Go-Live Compliance
- [ ] Privacy impact assessment finalized
- [ ] Updated Notice of Privacy Practices (if patient-facing AI changes data use)
- [ ] Staff training completed on new systems and HIPAA implications
- [ ] Incident response plan updated to include AI systems
- [ ] Monitoring and alerting configured for security events
- [ ] Compliance sign-off from Privacy Officer and Security Officer

---

## 7. Ongoing Compliance Operations

### Monitoring & Auditing
- [ ] Continuous monitoring for unauthorized PHI access
- [ ] Regular access reviews (quarterly minimum)
- [ ] Annual HIPAA risk assessment updated to include AI systems
- [ ] AI model performance monitoring for accuracy and bias
- [ ] Vendor compliance re-assessment (annual)
- [ ] Employee HIPAA training refresher (annual)

### Incident Response
- [ ] AI-specific incident response procedures documented
- [ ] Breach notification timeline understood (60 days to HHS for >500 records)
- [ ] State-specific breach notification requirements documented
- [ ] Incident response team roles and responsibilities defined
- [ ] Tabletop exercise conducted including AI system scenarios

### Documentation & Records
- [ ] HIPAA policies updated to address AI systems
- [ ] Risk assessment documentation current
- [ ] BAA inventory current and complete
- [ ] Training records maintained (6-year retention)
- [ ] Audit logs retained per policy (minimum 6 years)
- [ ] AI model documentation: Training data, performance metrics, bias assessments

---

## 8. State-Specific Considerations

*To be completed after confirming operating states:*

- [ ] Identify all states where MedTech operates clinics
- [ ] Review state-specific health data privacy laws (e.g., California CCPA/CMIA, Texas HB 300, New York SHIELD Act)
- [ ] Review state-specific breach notification requirements
- [ ] Review state-specific AI regulations (if any)
- [ ] Review state health information exchange requirements
- [ ] Identify any state-specific patient consent requirements
- [ ] Document any state requirements more restrictive than HIPAA

---

## 9. Compliance Decision Log

| Date | Decision | Rationale | Approved By | Relevant Regulation |
|------|----------|-----------|-------------|-------------------|
| | | | | |

---

## 10. Phase Gate Compliance Sign-Off

| Phase | Compliance Review Complete | Privacy Officer Sign-Off | Security Officer Sign-Off | Date |
|-------|---------------------------|-------------------------|--------------------------|------|
| Discovery | [ ] | [ ] | [ ] | |
| Strategy | [ ] | [ ] | [ ] | |
| Phase 2 Design | [ ] | [ ] | [ ] | |
| Phase 2 Go-Live | [ ] | [ ] | [ ] | |
| Phase 3 Design | [ ] | [ ] | [ ] | |
| Phase 3 Go-Live | [ ] | [ ] | [ ] | |

---

## References

- HIPAA Privacy Rule: 45 CFR Part 160 and Part 164, Subparts A and E
- HIPAA Security Rule: 45 CFR Part 160 and Part 164, Subparts A and C
- HIPAA Breach Notification Rule: 45 CFR Part 164, Subpart D
- HHS Guidance on HIPAA and Cloud Computing (2016, updated)
- HHS Guidance on De-Identification (Safe Harbor and Expert Determination)
- NIST Cybersecurity Framework
- NIST AI Risk Management Framework (AI RMF)
- ONC Health IT Certification Criteria (if applicable)
- CMS Interoperability and Patient Access Rule
