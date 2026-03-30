# HVAC Missed-Call Recovery Concierge: Software Scope

## Readiness Verdict

`build_now`

This wedge has earned software. The service is already validated, the pain is
repeated across multiple HVAC owners, and the workflow is repetitive enough to
compress into a narrow product. Buyer access is also strong because the same
owner profile experiencing the pain is the likely purchaser.

The main implementation risk is overbuilding into a general CRM, phone system,
or AI receptionist. That risk is manageable if v1 stays focused on one job:
recovering revenue from missed inbound calls.

## Product Wedge

- Primary user: HVAC business owner or office manager responsible for inbound
  lead follow-up
- One narrow job: turn missed inbound calls into booked follow-up conversations
  before the lead goes cold
- One core workflow: detect a missed call, trigger immediate outreach, capture
  the lead response, and route a callback task back to the business
- Productization trigger: the same missed-call recovery workflow is already
  being delivered repeatedly across multiple HVAC owners with clear pain and
  repeatable steps

## Manual vs Automated

### What remains manual

- Final phone callback and closing conversation by the HVAC team
- Exception handling for unusual lead situations
- Tuning outreach scripts based on local business preferences
- Deciding business hours, routing rules, and escalation rules during onboarding

### What gets automated first

- Detecting a missed inbound call event
- Starting a recovery sequence immediately after the missed call
- Sending the first outreach message to the lead
- Collecting basic lead intent and preferred callback timing
- Creating a callback task or queue item for the business
- Escalating to a human when the lead replies in a way that needs judgment

## MVP Boundary

Keep v1 to one user role, one workflow, one input, and one output.

- One user role: owner or office manager
- One core workflow: missed call to recovered callback task
- One key input: missed inbound call event with caller identity if available
- One key output: qualified callback task with conversation status
- One escalation trigger: lead response that cannot be handled by the scripted
  recovery flow

## Do Not Build Yet

- Full CRM or pipeline management
- Dispatching and technician scheduling
- Multi-location franchise administration
- Broad analytics dashboards beyond basic recovery outcomes
- Deep phone-system integrations beyond what is needed to detect missed calls
- Two-way omnichannel inbox for every customer communication
- AI voice receptionist replacing the full front desk
- Marketplace or multi-sided coordination between homeowners and contractors

## Structured Scope

```json
{
  "readiness_verdict": "build_now",
  "product_wedge": {
    "primary_user": "HVAC business owner or office manager responsible for inbound lead follow-up",
    "job_to_be_done": "Turn missed inbound calls into booked follow-up conversations before the lead goes cold",
    "core_workflow": "Detect a missed inbound call, trigger immediate outreach, capture lead response, and route a callback task back to the business"
  },
  "manual_work": [
    "Final phone callback and closing conversation by the HVAC team",
    "Exception handling for unusual lead situations",
    "Tuning outreach scripts based on local business preferences",
    "Deciding business hours, routing rules, and escalation rules during onboarding"
  ],
  "automated_first": [
    "Detecting a missed inbound call event",
    "Starting a recovery sequence immediately after the missed call",
    "Sending the first outreach message to the lead",
    "Collecting basic lead intent and preferred callback timing",
    "Creating a callback task or queue item for the business",
    "Escalating to a human when the lead replies in a way that needs judgment"
  ],
  "mvp_boundary": [
    "One user role: owner or office manager",
    "One core workflow: missed call to recovered callback task",
    "One key input: missed inbound call event with caller identity if available",
    "One key output: qualified callback task with conversation status",
    "One escalation trigger: lead response that cannot be handled by the scripted recovery flow"
  ],
  "productization_trigger": "The same missed-call recovery workflow is already being delivered repeatedly across multiple HVAC owners with clear pain and repeatable steps",
  "do_not_build_yet": [
    "Full CRM or pipeline management",
    "Dispatching and technician scheduling",
    "Multi-location franchise administration",
    "Broad analytics dashboards beyond basic recovery outcomes",
    "Deep phone-system integrations beyond what is needed to detect missed calls",
    "Two-way omnichannel inbox for every customer communication",
    "AI voice receptionist replacing the full front desk",
    "Marketplace or multi-sided coordination between homeowners and contractors"
  ]
}
```
