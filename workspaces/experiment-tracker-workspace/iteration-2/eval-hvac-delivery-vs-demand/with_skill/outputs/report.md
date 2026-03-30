## Experiment Summary

- 12 HVAC owner conversations were completed.
- 4 owners said missed calls are a painful problem.
- 2 owners agreed to a paid pilot.
- 1 owner actually paid.
- 1 customer churned after setup because the workflow was too custom.

What this means:

- There is real pain around missed calls for at least part of the HVAC market.
- There is some willingness to pay, but conversion from pain to payment is still
  low.
- The current delivery model appears fragile because custom setup creates churn
  risk.

## Signal Quality

- Strong signal: 1 customer paid. Paid commitment is the clearest evidence that
  the problem matters enough to spend money on.
- Strong signal: 4 owners independently described missed calls as painful.
  Repeated workflow pain from the target ICP is meaningful.
- Weak signal: 2 owners agreed to a paid pilot, but only 1 completed payment.
  Verbal agreement is helpful, but weaker than cash collected.
- Contradictory signal: A customer churned after setup because the workflow was
  too custom. This suggests demand may exist, but the current solution is not
  repeatable or easy to adopt.
- Vanity signal: none.

## Decision State

`narrow`

The wedge should be kept, but narrowed from "HVAC owners with missed-call pain"
to "HVAC owners whose missed-call workflow can be served with a standardized
setup." The main uncertainty is no longer whether the pain exists; it is whether
the solution can be delivered in a repeatable way without heavy customization.

## Next Experiment

Run one standardized pilot offer for new HVAC prospects with a fixed setup
scope, fixed onboarding steps, and a clear "not supported" boundary. Success
criteria: at least 2 new prospects accept the standard workflow without custom
requests, and at least 1 remains active through the first usage period.

This is the best next experiment because it directly tests whether the business
can convert real pain into repeatable delivery, which is the biggest unresolved
risk after the first paid pilot and churn.

## Structured Log

```json
{
  "experiments": [
    "12 HVAC owner conversations to assess pain and demand",
    "Paid pilot offer to qualified HVAC owners",
    "Initial customer setup and onboarding"
  ],
  "strong_signals": [
    "4 HVAC owners said missed calls are painful",
    "1 prospect converted into an actual paid pilot"
  ],
  "weak_signals": [
    "2 owners agreed to a paid pilot, but only 1 actually paid"
  ],
  "contradictions": [
    "1 customer churned after setup because the workflow was too custom"
  ],
  "decision_state": "narrow",
  "next_experiment": "Run a standardized pilot for new HVAC prospects with fixed setup scope and explicit no-custom boundaries to test whether the offer can be delivered repeatably.",
  "rationale": "Demand signal exists because buyers described the pain repeatedly and one customer paid, but the current delivery model is not yet repeatable. The next step should reduce customization and test whether a narrower, standardized workflow can retain customers."
}
```
