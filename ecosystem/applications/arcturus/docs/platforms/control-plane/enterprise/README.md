# Synthetic Enterprise Platform

**Owner:** Ajwa Zainab (`@AjwaZainab`)  
**Plane:** Control Plane  
**Source:** `src/control_plane/enterprise/`  
**Contracts:** `contracts/control/enterprise/`  
**Tests:** `tests/control/enterprise/`

---

## Purpose

The Synthetic Enterprise Platform takes the abstract organizational blueprint from the Ontology platform and materializes it into a fully structured synthetic company. This is where the simulation gets its "company" — complete with departments, business units, teams, hierarchy, and governance structure.

---

## Enterprise Hierarchy

```
ORGANIZATION
   |
   +-- EXECUTIVE OFFICE
   |     (CEO / CFO / COO — top of the Reporting Hierarchy)
   |
   +-- BUSINESS UNIT (optional)
   |     |
   |     +-- DIVISION (optional)
   |           |
   |           +-- FUNCTIONAL AREA
   |                 |
   |                 +-- DEPARTMENT   (Leadership: Director)
   |                       |
   |                       +-- TEAM   (Leadership: Manager/Lead)
   |                             |
   |                             +-- Individual Contributors
   |
   +-- SHARED SERVICES (optional, centralized: IT, Legal, Facilities)
```

---

## Enterprise Templates

The platform supports 8 configurable enterprise templates:

| Template | Description |
|---|---|
| `startup` | Flat, small-scale, fast-moving |
| `enterprise_saas` | Medium-large, product-led |
| `conglomerate` | Multi-division, complex hierarchy |
| `government` | Rigid structure, compliance-heavy |
| `nonprofit` | Flat, mission-driven |
| `consulting_firm` | Project-based, client-centric |
| `manufacturing` | Ops-heavy, supply chain driven |
| `healthcare` | Regulation-heavy, department-specialized |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/control/enterprise/base_models.py` | `EnterpriseTemplatePayload`, `EnterpriseConfigurationPayload`, `EnterpriseInstanceContract` |
| `src/control_plane/enterprise/enterprise_generator.py` | `EnterpriseGenerator.generate()` — main generation logic |
| `src/control_plane/enterprise/enterprise_adapters.py` | Contract ↔ internal model translation |

---

## Inbound Contracts

| Contract | From | Purpose |
|---|---|---|
| `OntologySnapshotContract` | Hamza (Ontology) | Defines the org primitives to build from |
| `SimulationContext` | Shared | Seed and run metadata |

---

## Outbound Contracts

| Contract | To | Purpose |
|---|---|---|
| `EnterpriseInstanceContract` | Maaz (Runtime) | The generated company structure |
| `OrganizationalContextPayload` | Javeria (Workflows) | Org context for workflow assignment |

---

## Usage Example

```python
from ecosystem.applications.arcturus.src.control_plane.enterprise.enterprise_generator import EnterpriseGenerator
from ecosystem.applications.arcturus.contracts.control.enterprise.base_models import (
    EnterpriseTemplatePayload,
    EnterpriseConfigurationPayload,
)

gen = EnterpriseGenerator()

template = EnterpriseTemplatePayload(
    context=ctx,
    template_id="TPL-001",
    template_name="Tech Corp",
    industry_type="enterprise_saas",
    scale_profile="medium",
    default_business_units=[],
    default_org_depth=3,
    governance_complexity="matrix"
)

config = EnterpriseConfigurationPayload(
    context=ctx,
    config_id="CFG-001",
    template_id="TPL-001",
    org_name="Horquva Systems",
    department_count_override=5,
    team_size_range=(5, 15),
    custom_business_units=[]
)

instance = gen.generate(template, config)
print(instance.is_structurally_valid)   # True
print(instance.organization.org_name)   # "Horquva Systems"
```

---

## Running Enterprise Tests

```bash
pytest ecosystem/applications/arcturus/tests/control/enterprise/ -v
```
