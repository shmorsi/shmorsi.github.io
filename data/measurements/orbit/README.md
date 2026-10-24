# Measured Orbit files

These JSON files are copies of the measured archives. Do not edit them by hand.

- `code_v2/claude-haiku-5-5/single.json` and `team.json`: protocol `code-eval-v2`, 32 frozen tasks, model `claude-haiku-5-5`, scored once. `comparison.json` pairs.team_minus_single.pass_at_1 is 0.000 to 0.15625 (point 0.0625) and includes zero, so the gap between 29 of 32 and 27 of 32 is not an improvement. Estimated cost is 0.0183623 USD (team) and 0.006672 USD (single).
- `v3_qwen1.5b/`: harness v3 rescore of `Qwen/Qwen2.5-1.5B-Instruct`, including `comparison.json` (paired percentile bootstrap, 10,000 resamples, seed 0). An interval that includes zero is not an improvement.

The files name the model and the adapter paths. They do not name the GPU.
