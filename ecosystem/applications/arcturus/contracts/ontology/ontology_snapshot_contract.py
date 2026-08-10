from pydantic import BaseModel, Field
from typing import List, Optional

# ---------------------------------------------------------
# 1. BASE CONTEXT (Mandatory for all Arcturus payloads)
# ---------------------------------------------------------
class SimulationContext(BaseModel):
    """
    Base execution context guaranteeing deterministic runs across platforms.
    """
    run_id: str = Field(
        ..., 
        description="Unique identifier for the current simulation run"
    )
    experiment_id: str = Field(
        ..., 
        description="Identifier for the overarching scenario experiment"
    )
    global_seed: int = Field(
        ..., 
        description="Global seed to ensure deterministic entity resolution and state transitions"
    )

# --------------------------------
# 2. CORE CONSTITUTIONAL ENTITIES
# --------------------------------

class OrganizationState(BaseModel):
    org_id: int = Field(..., description="Unique identifier for the organization")
    org_name: str = Field(..., description="Name of the organization (e.g., 'Horquva')")
    leader: Optional[str] = Field(None, description="Head of the whole org")

class DepartmentState(BaseModel):
    dept_id: int = Field(..., description="Unique identifier for the department")
    div_id: int = Field(..., description="Which division this department is under")
    dept_name: Optional[str] = Field(None, description="Name of the department (e.g., 'HR')")
    readiness_score: float = Field(default=1.0, description="Current operational state")
    cost: Optional[float] = Field(None, description="Total resources used")

class DivisionState(BaseModel):
    div_id: int = Field(..., description="Unique identifier for the division")
    div_name: str = Field(..., description="Name of the division (e.g., 'Simulation Division')")
    org_id: int = Field(..., description="Which organization this division is under")

class TeamState(BaseModel):
    team_id: int = Field(..., description="Unique identifier for the team")
    dept_id: int = Field(..., description="Which department this team is under")
    total_employees: float = Field(..., description="Max number of employees in the team")

class EmployeeState(BaseModel):
    employee_id: int = Field(..., description="Unique identifier for the employee")
    name: Optional[str] = Field(None, description="Name of the employee (e.g., 'Ali')")
    role_id: int = Field(..., description="What the employee has to do")
    status: str = Field(..., description="Current status: active, Inactive, Overload")

class RoleState(BaseModel):
    role_id: int = Field(..., description="Unique identifier for the role")
    role_title: str = Field(..., description="Title of the role (e.g., 'Enterprise Engineer')")
    access_level: float = Field(..., description="How much authorization is given")

class PolicyState(BaseModel):
    policy_id: int = Field(..., description="Unique identifier for the policy")
    logic: str = Field(..., description="The rule that needs to be checked (boolean evaluation)")
    severity_level: float = Field(..., description="low, critical, medium")

class CapabilityState(BaseModel):
    cap_id: int = Field(..., description="Unique identifier for the capability")
    dept_id: int = Field(..., description="Which department it is under")
    readiness_score: float = Field(..., description="Metric of when it can be executed")

class ProcessState(BaseModel):
    process_id: int = Field(..., description="Unique identifier for the process")
    cap_id: int = Field(..., description="Which capability this process is under")
    duration: float = Field(..., description="Minimum time the process should take")

class WorkflowState(BaseModel):
    workflow_id: int = Field(..., description="Unique identifier for the workflow")
    process_id: int = Field(..., description="Which process it uses")
    state: str = Field(..., description="completed, pending, blocked")

class EventState(BaseModel):
    event_id: int = Field(..., description="Unique identifier for the event")
    type: str = Field(..., description="system_alert, minor Update")
    timestamp: float = Field(..., description="The exact time the event occurred")

class GoalState(BaseModel):
    goal_id: int = Field(..., description="Unique identifier for the goal")
    target_metric: float = Field(..., description="Value of success")
    time_horizon: int = Field(..., description="The timestamp by which it should be met")

class DecisionState(BaseModel):
    decision_id: int = Field(..., description="Unique identifier for the decision")
    emp_id: int = Field(..., description="Employee that made the decision")
    chosen_branch: str = Field(..., description="The specific path taken")

class KnowledgeState(BaseModel):
    knowledge_id: int = Field(..., description="Unique identifier for the knowledge")
    domain_tag: str = Field(..., description="Categorizes the knowledge")
    access_level: str = Field(..., description="Minimum authorization required")

class RiskState(BaseModel):
    risk_id: int = Field(..., description="Unique identifier for the risk")
    probability_score: float = Field(..., description="Likelihood of occurrence")
    impact_severity: str = Field(..., description="low, medium, high")

class AssetState(BaseModel):
    asset_id: int = Field(..., description="Unique identifier for the asset")
    asset_type: str = Field(..., description="Asset classification (e.g., 'Physical Infrastructure')")
    operational_state: str = Field(..., description="active, degraded, offline")

class ResourceState(BaseModel):
    resource_id: int = Field(..., description="Unique identifier for the resource")
    quantity_available: float = Field(..., description="Amount left in real time")
    depletion_rate: float = Field(..., description="The speed at which it is consumed")

class RelationshipState(BaseModel):
    # Mapping the relational graph as an entity to prevent infinite loops
    source_entity_id: int = Field(..., description="ID of the parent/origin entity")
    target_entity_id: int = Field(..., description="ID of the child/destination entity")
    relationship_type: str = Field(..., description="Directionality (e.g., Parent-to-Child, Peer-to-Peer)")

# ---------------------------------------------------------
# 3. THE BOOTSTRAP CONTRACT
# ---------------------------------------------------------
class OntologySnapshotContract(SimulationContext):
    """
    Immutable, versioned domain state for clock ticks and deterministic replay.
    Upstream platforms will build against this exact shape.
    """
    snapshot_version: str = Field(
        default="1.0", 
        description="Ontology schema version for provenance tracking"
    )
    
# Core Structural Graph
    organizations: List[OrganizationState] = Field(default_factory=list)
    divisions: List[DivisionState] = Field(default_factory=list)
    departments: List[DepartmentState] = Field(default_factory=list)
    teams: List[TeamState] = Field(default_factory=list)
    
    # Workforce Graph
    employees: List[EmployeeState] = Field(default_factory=list)
    roles: List[RoleState] = Field(default_factory=list)
    
    # Operational & Behavioral Graph
    capabilities: List[CapabilityState] = Field(default_factory=list)
    processes: List[ProcessState] = Field(default_factory=list)
    workflows: List[WorkflowState] = Field(default_factory=list)
    policies: List[PolicyState] = Field(default_factory=list)
    decisions: List[DecisionState] = Field(default_factory=list)
    events: List[EventState] = Field(default_factory=list)
    
    # Environmental & Constraints Graph
    goals: List[GoalState] = Field(default_factory=list)
    knowledge: List[KnowledgeState] = Field(default_factory=list)
    risks: List[RiskState] = Field(default_factory=list)
    assets: List[AssetState] = Field(default_factory=list)
    resources: List[ResourceState] = Field(default_factory=list)
    
    # Relational Edges
    relationships: List[RelationshipState] = Field(default_factory=list)