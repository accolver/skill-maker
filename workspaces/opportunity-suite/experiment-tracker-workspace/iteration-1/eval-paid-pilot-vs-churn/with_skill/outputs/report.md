# Experiment Summary

- 12 HVAC owner conversations were completed.
- 4 owners said missed calls are a painful problem, which shows real problem
  resonance but only in a subset of the conversations.
- 2 owners agreed to a paid pilot, which is meaningful buying signal beyond
  verbal interest.
- 1 owner actually paid, which is the strongest signal in the dataset because it
  converts pain into real commitment.
- 1 pilot churned after setup because the workflow was too custom, which
  suggests delivery friction and low repeatability in the current
  implementation.

# Signal Quality

- Strong signal: 1 customer paid. Paid commitment is the clearest evidence that
  the problem is worth solving for at least part of the HVAC segment.
- Strong signal: 4 conversations surfaced the same missed-call pain. Repeated
  pain from the target ICP suggests the wedge is real.
- Strong signal: 2 owners agreed to a paid pilot. This is stronger than generic
  interest because it reflects willingness to test a commercial relationship.
- Contradictory signal: 1 customer churned after setup due to excessive
  customization. Demand exists, but the current service design may be too
  bespoke to retain customers efficiently.
- Weak signal: 8 of 12 conversations did not produce the same explicit pain
  statement. That does not kill the idea, but it means the opportunity is not
  broad enough yet to treat all HVAC owners as equally promising.

# Decision State

`narrow`

The wedge has real signal, but the evidence does not support broadening yet. The
strongest lesson is not "HVAC owners want this" in general. It is "some HVAC
owners with acute missed-call pain will pay, but the current implementation is
too custom to retain them." The right move is to narrow toward a tighter
customer profile and a more standardized workflow.

# Next Experiment

Run one standardized paid pilot for a narrowly defined HVAC sub-segment with the
same missed-call workflow and minimal customization.

Success criteria:

- Recruit 3 HVAC owners who all report missed calls as a top pain.
- Sell the same pilot scope, onboarding steps, and follow-up process to all 3.
- Measure whether they activate without custom setup requests and whether at
  least 2 stay active through the initial pilot period.

This best resolves the biggest remaining uncertainty: whether the business can
retain paying customers with a repeatable workflow, rather than winning isolated
custom deals.

# Structured Log

See `result.json` for the machine-readable experiment log.
