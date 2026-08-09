# Integration Issue & Ownership Log — T1

**Maintained by:** Affan

Integration defects found while wiring the T1 chain. One row per issue.

---

## How this works

When a signal stops moving, the issue is recorded here and assigned to the boundary that owns it.

**Integration fixes it** when the cause is transport, configuration, wiring, environment, logging, or health.

**The domain owner fixes it** when the cause is inside a capability — wrong shape, missing field, incorrect logic, contract violation. Integration records it, assigns it, tracks it, and retests. Integration does not fix another owner's domain logic.

An issue is closed only after the chain has been retested with a real signal.

---

## Open

| # | Found at | Symptom | Cause | Owner | Status |
|---|---|---|---|---|---|
| 1 | `infrastructure/databases` | Staging Supabase database password was shared over a chat channel and must be treated as exposed. | Credential handled outside a secret store. | Affan | open — rotate before staging holds any real signal data |

## Closed

| # | Found at | Cause | Owner | Fix | Retested |
|---|---|---|---|---|---|
| | | | | | |

---

## Recording an issue

| Column | Content |
|---|---|
| **Found at** | The hop, from §2 of the [integration map](T1_INTEGRATION_MAP.md) — e.g. `evidence.classification` |
| **Symptom** | What was observed. Include the `signal_id`. |
| **Cause** | Confirmed cause. Leave blank until confirmed — do not record a suspicion as a cause. |
| **Owner** | The person who owns the boundary where the cause sits |
| **Status** | `open` · `assigned` · `fixed` · `retested` |

Separate what is confirmed from what is suspected. A cause recorded before it is confirmed sends the fix to the wrong owner and costs more time than the original defect.

## Known failure points

Identified before wire-up. These are the places to check first when a signal stops.

| Failure | Consequence | Owner |
|---|---|---|
| GitHub credentials or webhook secret unavailable | No real signal can enter | Umer |
| A hop generates a new `signal_id` instead of preserving it | The signal cannot be traced end to end | The hop's owner |
| `classification` widened downstream | Security defect | The hop's owner |
| `evidence_ids` do not resolve against stored records | Result is not evidence-linked; the gate does not close | Saad, Janita |
| Contract changed after freeze without telling adjacent owners | Wire-up fails at a boundary that was working | The contract owner |
| A hop substitutes a default instead of failing | The gate appears to pass on a fabricated result | The hop's owner |
| Database unreachable | Persistence stops | Affan, Janita |
| Orchestrator unreachable over HTTP | No finding produced | Affan, Saad |

The last one in the first group is the most damaging: a substituted default makes the chain look complete when it is not. Any hop that cannot process a signal logs the reason and stops.
