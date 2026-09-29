# eIRWR: Enhanced Iterative Random Walk with Restart for Scalable Root Cause Analysis in Microservices

**Authors**: Saiful Khan, Afrah Farea  
**arXiv ID**: [arXiv:2608.08073](https://arxiv.org/abs/2608.08073) (cs.DC, cs.SE, eess.SY)  
**Published Date**: August 8, 2026  
**License**: CC BY 4.0  

---

eIRWR: Enhanced Iterative Random Walk with Restart for Scalable Root Cause Analysis in Microservices
Saiful Khan, Afrah Farea
Abstract
Root cause analysis (RCA) in microservice architectures needs to pinpoint the originating faulty service responsible for the cascading symptoms seen across hundreds or thousands of interdependent services.
Graph-based random walk methods propagate anomaly evidence over the service dependency graph.
However, existing anomaly-restart walks leave much of the localization signal unused: they restart from the raw anomaly vector, which is dominated by loud downstream victims rather than the quieter source.
Through a controlled ablation, we first show that the “resilience damping” often applied to the transition matrix is mathematically equivalent to raising the restart probability; we therefore benchmark against a restart-tuned Personalized PageRank (PPR) rather than its default configuration.
We then present
Enhanced Iterative Random Walk with Restart
(eIRWR), which (a) concentrates restart mass on the most suspicious nodes through power-law teleportation sharpening, (b) augments the transition matrix with self-loops and backward edges so that probability accumulates at cascade sources, and (c) refines its belief across an outer loop.
On three large-scale topologies (12K–25K nodes) from the Alibaba Microservice Trace Dataset, eIRWR attains a Mean Reciprocal Rank (MRR) of
0.75
at moderate root-cause visibility, a
2.8
times improvement over the best aggregate-metric baseline and well above a restart-tuned PPR. At high visibility it reaches MRR
=0.94
, while running in under 25 ms on graphs with 17,000 nodes, making it suitable for online deployment.
K
eywords
Microservices
\cdot
Root Cause Analysis
\cdot
Random Walk with Restart
\cdot
Service Dependency Graph
\cdot
Cascading Failures
1
Introduction
Modern cloud-native applications decompose monolithic systems into many loosely coupled microservices that communicate over the network, following the principles of service-oriented computing (SOC)
[
1
,
2
,
3
,
4
,
5
,
6
]
.
While this architecture brings agility and independent scalability, it also creates complex failure modes: a fault in a single service can cascade through chains of synchronous calls, causing latency spikes, error bursts, and degraded user experience across seemingly unrelated services. Quickly identifying the root cause (the originating faulty service) is critical for minimizing downtime and restoring services.
During an incident, monitoring and anomaly-detection systems
[
7
,
8
]
observe anomaly signals (e.g., elevated latency, increased error rates) at many services simultaneously.
The root cause analysis (RCA) task is to rank services by their likelihood of being the originating fault, given (i) the service dependency graph extracted from distributed traces and (ii) the observed anomaly vector aggregated at the service level.
The challenge is that the root cause is often not the service with the highest anomaly score: downstream victims that receive cascading failures frequently exhibit louder symptoms than the source itself.
We focus on the aggregate-metric setting: no per-request traces are available, only a service-level call graph and an anomaly vector derived from aggregate metrics (e.g., P99 latency, error rate). This is the most widely applicable scenario because, while some systems support per-request tracing
[
9
,
10
]
, many production deployments export only aggregate metrics due to overhead, sampling, or privacy constraints.
Graph-based random walk methods, such as Personalized PageRank (PPR)
[11]
, CloudRanger
[12]
, and MonitorRank
[13]
, have emerged as a principled framework for aggregate-metric RCA, propagating anomaly evidence through the dependency graph to localize the root cause. However, these methods walk on the dependency weight matrix
W
, which encodes normalized call frequencies. This matrix captures which services communicate, but not how faults propagate. It does not model the direction of fault cascades (backward, from callees to callers) or the fact that resilient services absorb failures without propagating them. Consequently, the walker can disperse probability toward irrelevant regions of the graph, especially when the root cause has low visibility in the anomaly vector.
We revisit the anomaly-restart random walk and explore its localization power. Starting with the anomaly-seeded walk over the dependency graph (called the Iterative Random Walk with Restart or IRWR), we conduct a controlled ablation study.
We find that two common mechanisms credited for accuracy gains, e.g., transposing the transition matrix and damping it with a uniform “resilience” factor, do not explain the improvement.
A uniform resilience factor simply makes the walk sub-stochastic, which is algebraically similar to raising the restart probability. When the baseline PPR is given the same effective restart, the gap closes.
The improvement that truly stands out comes from reshaping how the walk restarts and what it focuses on. Our method, Enhanced IRWR (eIRWR), implements several key changes:
(i) It sharpens the restart (or teleportation) distribution using a power law, which allows the restart mass to concentrate on the most suspicious nodes instead of the more obvious targets.
(ii) It enhances the transition matrix by adding self-loops and backward edges, ensuring that probability accumulates at the sources of cascades.
(iii) It refines our understanding of which nodes are suspicious through an outer loop.
To summarize, our contributions include:
(a)
We show that the accuracy improvement of resilience-damped walks over PPR is fully explained by an increased effective restart probability, not by directionality or resilience heterogeneity. We therefore evaluate against a restart-tuned PPR, a fairer and stronger baseline than the default configuration used in the previous work.
(b)
We propose Enhanced Iterative Random Walk with Restart (eIRWR), which is a refined and structurally enhanced anomaly-restart walk such that it combines power-law teleportation sharpening, self-loop and backward-edge augmentation, and belief refinement.
(c)
We evaluate on three large-scale topologies (12K–25K nodes) from the Alibaba Microservice Trace Dataset
[14]
, comparing against eight aggregate-metric baselines.
2
Related Work
Root Cause Analysis (RCA) and anomaly detection in microservices have been extensively studied, with recent surveys, e.g.,
[15]
, providing comprehensive overviews.
Simple metric-based RCA techniques fall into two main categories: direct metric ranking and graph-aware analysis. Direct metric ranking ranks services based on anomaly scores, like latency spikes or error rates. However, this approach often misidentifies downstream issues as root causes, especially when visibility into the actual cause is low.
2.1
Graph-Based Random Walk
Graph-based methods address the metric-based limitations by modeling the service dependencies as a directed graph and performing random walks to propagate anomaly evidence.
Brin and Page
[16]
introduced PageRank for ranking web pages by structural importance. In the RCA setting, standard PageRank identifies structurally important services but is entirely anomaly-unaware. It produces the same ranking regardless of the current incident.
MicroRCA
[11]
addresses this by adapting PPR, substituting the uniform teleportation vector with the observed anomaly vector
\bm{s}_{\mathrm{obs}}
, so the walker preferentially restarts at anomalous nodes. The iteration is
\bm{r}^{(k+1)}=(1-\alpha)\,\bm{W}\,\bm{r}^{(k)}+\alpha\,\bm{s}_{\mathrm{obs}}
,
where
\bm{W}
is the row-stochastic dependency weight matrix.
MicroRCA is the closest prior work to our eIRWR method: it shares our power-iteration framework on the same topology.
However, rather than seeding the walk with raw anomaly scores at a fixed restart rate, eIRWR sharpens and structurally augments the restart vector to focus probability density on cascade sources.
CloudRanger
[12]
uses a second-order random walk where the transition probabilities are influenced by both edge weights and neighboring anomaly scores. At each step, the probability of moving from node
i
to neighbor
j
is directly proportional to
w_{ij}\cdot s_{\mathrm{obs}}(j)
, effectively steering the walker towards anomalous regions. However, this approach relies on stochastic sampling through many short walks, which can make it less efficient compared to deterministic power-iteration methods and more sensitive to the number of walks conducted. On the other hand, MonitorRank
[13]
modifies the transition matrix based on the anomaly correlation between connected services using the formulation
\bm{W}_{\mathrm{corr}}=\mathrm{diag}(\sqrt{\bm{s}})\,\bm{W}\,\mathrm{diag}(\sqrt{\bm{s}})
. This method maintains matrix sparsity while enhancing transition weights between jointly anomalous services. Although MonitorRank emphasizes that the context of anomalies should influence the walk, it does not account for the underlying mechanics of fault propagation.
2.2
Graph Traversal and Pruning
This family of methods avoids iterative convergence and instead traverses the call graph for a fixed number of hops. Alibaba’s MicroHECL
[17]
traces anomaly symptoms backward through the call graph using transposed weights, accumulating evidence at each hop for a fixed maximum depth. This method is computationally efficient, operating at
O(d\,|E|)
. However, its fixed-depth traversal limits its ability to capture long-range dependencies, and it lacks the restart mechanism in RWR-based methods, which can lead to drifting into irrelevant graph regions. In contrast, Microsoft’s TraceDiag
[18]
adopts a two-stage approach by pruning low-anomaly nodes to reduce noise before running PPR on the pruned subgraph. While this strategy enhances scalability and is beneficial in noisy environments, the application of a hard pruning threshold may inadvertently discard the true root cause when its visibility is low, particularly in scenarios where RCA is more critical.
2.3
Spectrum-Based and Trace-Level
This family leverages disaggregated per-trace data rather than aggregate anomaly vectors.
MicroRank
[9]
combines Spectrum-Based Fault Localization (SBFL) with extended PageRank. The Ochiai formula scores each service
i
by its participation in failing vs. passing traces such that
\mathit{Score}_{i}=e_{f}^{(i)}/\sqrt{(e_{f}^{(i)}+e_{p}^{(i)})(e_{f}^{(i)}+n_{f}^{(i)})}
.
The spectrum scores are used as teleportation weights in a subsequent PageRank, and the final ranking is a weighted combination of spectrum and PageRank scores.
TraceRank
[10]
extends MicroRank with three innovations: (i) a correlation score
\mathrm{corr}_{i}=|\mathrm{PCC}(t_{i},t_{\mathrm{frontend}})|
that measures Pearson correlation between each service’s processing time and the front-end latency; (ii) an augmented adjacency matrix with forward, backward, and self-loop transitions weighted by the correlation scores; and (iii) a ranked list correction algorithm that promotes services that are both spectrally suspicious and statistically abnormal. TraceRank achieves strong results but requires disaggregated per-trace data, which is not always available at scale.
In contrast, our method operates on the aggregate anomaly vector and the dependency graph alone, making it applicable in settings where only monitoring metrics and call graph topology are observed.
Neighbor anomaly correlation methods such as PAL
[19]
and FChain
[20]
rank services by the statistical correlation between their anomaly and that of their neighbors. A common formulation aggregates caller anomaly (cascade signal), own anomaly, and callee anomaly. These approaches are fast but rely on first-order neighborhood information and cannot capture multi-hop propagation patterns.
2.4
Fault Management in SOC
Beyond the microservice RCA literature, fault management has a long history in the service-oriented computing community.
Model-based approaches diagnose faults from explicit behavioral models of the composed services, for example through partially observed stochastic Petri nets
[21]
, while graph-matching approaches compare an anomalous system state against a library of known anomalous graphs
[22]
.
Data-driven pipelines detect anomalies in service platforms
[7]
or combine detection with autonomous in-kernel remediation for cloud-native systems
[8]
, and deep learning has been applied to performance diagnosis in cloud microservices
[23]
.
These approaches either require explicit behavioral models, curated anomaly libraries, or trained models.
eIRWR complements them: it consumes only the service dependency graph and aggregate monitoring metrics that any service-oriented deployment already exposes, requires no training, and localizes the faulty service rather than only flagging the anomaly.
In summary, our method inherits the efficiency and iterative convergence of power-iteration walks (e.g., PPR/MicroRCA) and, like them, operates on aggregate metrics without per-trace data (as in Table 1 ).
What sets eIRWR apart is not a new transition matrix: we show that the resilience-damped transition reduces to an effective restart. Instead, it is a shaped restart: power-law teleportation sharpening together with self-loop and backward-edge augmentation, which concentrate probability at cascade sources. Unlike TraceRank and MicroRank it requires no per-trace data; unlike MicroHECL, it converges to a stationary distribution rather than truncating at a fixed depth.
Table 1:
Comparison of RCA methods.
Sharpen
= shaped restart (teleportation sharpening and/or self-loop / backward-edge augmentation);
Iter.
= iterative convergence;
Trace
= requires per-trace data;
Weighted
= uses call-frequency weights.
Method
Sharpen
Iter.
Trace
Weighted
Raw Anomaly
–
–
–
–
PageRank
–
✓
–
✓
MicroRCA (PPR)
–
✓
–
✓
CloudRanger
–
–
–
✓
MonitorRank
–
✓
–
✓
In-Degree Centrality
–
–
–
✓
MicroHECL
–
–
–
✓
TraceDiag
–
✓
–
✓
Neighbour Correlation
–
–
–
✓
MicroRank
–
✓
✓
✓
TraceRank
✓
✓
✓
–
IRWR (diagnostic baseline)
–
✓
–
✓
eIRWR (ours)
✓
✓
–
✓
3
Proposed Method
We present our graph-based RCA method in two stages: (a) a basic anomaly-restart walk (IRWR) that we use mainly to establish a fair, restart-tuned baseline, and (b) our enhanced method (eIRWR).
Given a dependency graph extracted from distributed traces and an observed aggregate anomaly vector during an incident, eIRWR identifies the most probable root cause. It does so by iterating an anomaly-seeded random walk, whose restart distribution is sharpened. The transition matrix is structurally augmented to concentrate probability at cascade sources.
In the remainder of the paper, we distinguish the restart rate (the scalar probability \alpha), the restart distribution (the teleportation vector the walk restarts into), and restart shaping (modifying that distribution).
3.1
Problem Formulation
Consider a microservice system with
N
services. We model the architecture as a directed weighted graph
G=(V,E,\bm{W})
, where:
-
V=\{v_{1},\ldots,v_{N}\}
is the set of microservices,
-
E\subseteq V× V
is the set of directed edges (service
v_{i}
calls service
v_{j}
if
(v_{i},v_{j})\in E
),
-
\bm{W}\in\mathbb{R}^{N× N}
is the row-stochastic weight matrix encoding normalized request rates.
During an incident, a monitoring system observes an anomaly vector
\bm{s}_{\mathrm{obs}}\in\mathbb{R}^{N}_{\geq 0}
with
\|\bm{s}_{\mathrm{obs}}\|_{1}=1
, where
s_{i}
quantifies the anomaly severity at service
v_{i}
(e.g., normalized latency deviation).
The RCA task is to produce a ranking of services by their likelihood of being the root cause such that the originating service whose failure cascades through the dependency graph to produce the observed symptoms.
3.2
Graph Construction
Dependency weight matrix.
We extract the dependency graph from distributed tracing data (e.g., the Alibaba Microservice Trace Dataset [14]). Each edge
(v_{i},v_{j})
carries a request count
\lambda_{ij}
(the number of calls from v_{i} to v_{j} observed in the trace window). We construct the row-stochastic weight matrix
\bm{W}
:
w_{ij}=\frac{\lambda_{ij}}{\sum_{k=1}^{N}\lambda_{ik}}\,,
(1)
so that each row sums to one:
\sum_{j}w_{ij}=1
. Entry
w_{ij}
represents the fraction of service
v_{i}
’s outgoing traffic directed to service
v_{j}
. High-traffic edges carry larger weights, reflecting that services with more intense communication propagate faults more readily.
Resilience-damped transition matrix.
As a modeling device, one may posit that not all dependencies propagate failures equally, and introduce a per-service resilience factor
R_{i}\in[0,1]
representing the probability that service
v_{i}
absorbs a failure without propagating it. Damping the transition weights by
(1-R_{i})
gives the matrix
\bm{M}_{R}=\mathrm{diag}(\bm{1}-\bm{R})\,\bm{W}\,,
(2)
which is applied in the same power iteration as PPR.
A note of caution is in order, because this device is easily over-interpreted. When
\bm{R}
is uniform (R_{i}\equiv R), Eq. (2) simply scales every transition by the constant
(1-R)
, making the transition matrix sub-stochastic. As we show analytically in Section
3.7
and confirm empirically in the ablation of Section
4.3
, a uniformly sub-stochastic transition is algebraically equivalent to running PPR with a higher restart probability: the leaked mass is exactly compensated by the restart term. Uniform resilience damping therefore contributes no directional or structural information of its own: its entire effect is an increase in the effective restart rate. We keep Eq. (2) because it is the transition used by our basic method (IRWR) and by several prior walks, but we are careful to attribute its effect correctly, and we compare against a restart-tuned PPR that already enjoys this effect. The improvements that survive this stronger baseline are described next and form the substance of eIRWR.
3.3
Basic IRWR
The Iterative RWR computes a root cause probability vector
\bm{r}\in\mathbb{R}^{N}
via anomaly-seeded power iteration on the transition matrix
\bm{M}_{R}=\mathrm{diag}(\bm{1}-\bm{R})\,\bm{W}
:
\bm{r}^{(k+1)}=(1-\alpha)\,\bm{M}_{R}\,\bm{r}^{(k)}+\alpha\,\bm{s}_{\mathrm{obs}}\,,\qquad k=0,1,2,\ldots
(3)
where
\alpha\in(0,1)
is the restart probability and the initial state is
\bm{r}^{(0)}=\bm{s}_{\mathrm{obs}}
. Because
\bm{W}
is row-stochastic over out-edges, one application of
\bm{M}_{R}
accumulates each callee’s score into its callers (weighted by traffic share and damped by
(1-R_{i})
); the restart term re-injects the observed anomaly at every step. Setting
\bm{R}=\bm{0}
recovers exactly the PPR of MicroRCA.
Convergence.
Iteration stops when
\|\bm{r}^{(k+1)}-\bm{r}^{(k)}\|_{1}<\varepsilon
(default \varepsilon=10^{-6}). Since
\bm{M}_{R}
is (sub-)stochastic and
\alpha>0
, the mapping is a contraction with rate at most
(1-\alpha)
, guaranteeing convergence. Using sparse CSR representations, each iteration costs
O(|E|)
operations, and convergence typically occurs within 15–50 iterations in practice.
Root cause identification.
The root cause is the node with the highest converged probability
v^{*}=\arg\max_{i}\,r_{i}
.
A ranked list
v_{(1)},v_{(2)},\ldots
by decreasing
r_{i}
provides a candidate shortlist for on-call engineers.
3.4
Enhanced IRWR (eIRWR)
The basic IRWR uses a fixed resilience
R
and the raw anomaly vector as the teleportation target. We extend it with three mechanisms that improve localization accuracy, particularly at low root-cause visibility.
3.4.1
Anomaly-Conditioned Resilience
In practice, a service experiencing anomalous load or errors has degraded resilience: its circuit breakers, timeouts, and retry budgets are strained. We model this by making the resilience depend on the observed anomaly:
R_{i}=R_{\mathrm{base}}\cdot\exp\!\bigl(-\beta\,\hat{s}_{i}\bigr)\,,
(4)
where
\hat{s}_{i}=s_{i}/\max_{j}s_{j}
is the normalized anomaly score and
\beta\geq 0
is a sensitivity parameter. When
\beta=0
, all services share the base resilience
R_{\mathrm{base}}
; as
\beta
increases, anomalous services become less resilient and propagate faults more readily. This creates an anomaly-amplifying feedback loop in the transition matrix: services that are already distressed contribute more strongly to the random walk.
The adaptive transition matrix becomes:
\bm{M}_{\mathrm{base}}=\mathrm{diag}\!\bigl(\bm{1}-\bm{R}(\bm{s}_{\mathrm{obs}})\bigr)\,\bm{W}\,.
(5)
3.4.2
Backward Transitions and Self-Loops
The basic IRWR only walks along existing dependency edges. In some topologies, the root cause may be structurally distant from the most
symptomatic region. We add two mechanisms:
Backward transitions.
For each forward edge
(v_{i},v_{j})\in E
, we add a backward edge
(v_{j},v_{i})
with weight proportional to the caller’s belief score:
\bm{A}_{\mathrm{bwd}}[j,i]=\rho\cdot C_{i}\,,
(6)
for every forward edge
(v_{i},v_{j})\in E
whose reverse
(v_{j},v_{i})\notin E
, with
\rho\in[0,1)
a discount factor and
C_{i}
the belief score defined in Section
3.5
. Backward edges allow the walker to explore callers of anomalous services, which is essential when the root cause is upstream of the most visible symptoms.
Self-loops for suspicious nodes.
A root cause node tends to be more anomalous than any of its neighbors (it is the source, not a victim). We add self-loops to capture this signature:
\bm{A}_{\mathrm{self}}[i,i]=\max\!\bigl(0,\;C_{i}-\max_{j\in\mathcal{N}(i)}M_{ij}\bigr)\,,
(7)
where
\mathcal{N}(i)
is the neighborhood of node
i
. A node receives a self-loop only if its belief exceeds the maximum outgoing
transition weight, encouraging the walker to linger at likely root causes.
The combined transition matrix is:
\bm{M}=\mathrm{RowNorm}\!\bigl(\bm{M}_{\mathrm{base}}\cdot\mathrm{diag}(\bm{C})+\bm{A}_{\mathrm{bwd}}+\bm{A}_{\mathrm{self}}\bigr)\,,
(8)
where
\mathrm{RowNorm}(\cdot)
normalizes each row to sum to one.
3.4.3
Power-Law Teleportation Sharpening
The standard teleportation vector
\bm{s}_{\mathrm{obs}}
spreads probability mass across all nodes, including many with only background noise. We sharpen the teleportation by raising it to a power
q
:
\bm{v}=\frac{\bm{b}^{\,q}}{\|\bm{b}^{\,q}\|_{1}}\,,\qquad q\geq 1\,,
(9)
where
\bm{b}
is the current belief vector (see Section 3.5). For
q=1
, this reduces to standard teleportation. For
q>1
, mass concentrates at the most anomalous nodes, suppressing restarts to noisy background services. This is particularly effective at low root-cause visibility, where noise constitutes a larger fraction of the signal.
Adaptive exponent.
We adaptively set
q
based on the signal quality
\sigma=b_{\max}/\bar{b}
(ratio of peak to mean belief):
q_{\mathrm{adapt}}=1+(q-1)\cdot\min\!\Bigl(1,\;\max\!\bigl(0,\;\tfrac{\sigma-5}{15}\bigr)\Bigr)\,.
(10)
When the signal is weak (\sigma<5),
q_{\mathrm{adapt}}=1
(uniform teleportation) to encourage broad exploration. When the signal
is strong (\sigma>20), the full sharpening
q
is applied.
The thresholds 5 and 20 were fixed a priori as round values spanning weak and strong signal concentration, before any evaluation was run, and were held constant across all topologies and visibility levels.
3.5
Belief Refinement
eIRWR wraps the inner power iteration in an outer loop that progressively refines the belief about which nodes are suspicious. At outer iteration
t
:
\bm{b}^{(t)}=(1-\mu)\,\bm{s}_{\mathrm{obs}}+\mu\,\bm{r}^{(t-1)}\,,
(11)
where
\mu\in[0,1]
is a momentum parameter (default \mu=0.1). The belief
\bm{b}^{(t)}
influences both the transition matrix
(through \bm{C}) and the teleportation vector (through Eq. 9 ). A small
\mu
ensures the belief stays close to the raw observation, avoiding confirmation bias where the walk reinforces its own prior.
The outer loop converges when
\|\bm{r}^{(t)}-\bm{r}^{(t-1)}\|_{1}<\varepsilon_{\mathrm{outer}}
. In practice, a single outer iteration (n_{\mathrm{outer}}=1) suffices for most incidents.
Algorithm
1
summarizes the complete eIRWR procedure.
Algorithm 1
eIRWR: Sharpened Anomaly-Restart Random Walk
1:
Weight matrix
\bm{W}
, anomaly vector
\bm{s}_{\mathrm{obs}}
, parameters
R_{\mathrm{base}},\beta,\alpha,\rho,q,\mu,\varepsilon,n_{\mathrm{outer}}
2:
Root cause probability vector
\bm{r}
3:
\hat{\bm{s}}\leftarrow\bm{s}_{\mathrm{obs}}/\max(\bm{s}_{\mathrm{obs}})
\triangleright
normalize anomaly
4:
\bm{R}\leftarrow R_{\mathrm{base}}\cdot\exp(-\beta\,\hat{\bm{s}})
\triangleright
adaptive resilience
5:
\bm{M}_{\mathrm{base}}\leftarrow\mathrm{diag}(\bm{1}-\bm{R})\,\bm{W}
\triangleright
base propagation
6:
\bm{r}\leftarrow\bm{s}_{\mathrm{obs}}
\triangleright
initialize belief
7:
for
t=1
to
n_{\mathrm{outer}}
do
8:
\bm{b}\leftarrow(1-\mu)\,\bm{s}_{\mathrm{obs}}+\mu\,\bm{r}
\triangleright
belief refinement
9:
\bm{C}\leftarrow\bm{b}/\max(\bm{b})
10:
\bm{M}\leftarrow\mathrm{RowNorm}(\bm{M}_{\mathrm{base}}\cdot\mathrm{diag}(\bm{C})+\bm{A}_{\mathrm{bwd}}+\bm{A}_{\mathrm{self}})
11:
\bm{v}\leftarrow\bm{b}^{\,q_{\mathrm{adapt}}}/\|\bm{b}^{\,q_{\mathrm{adapt}}}\|_{1}
\triangleright
sharpened teleportation
12:
\bm{r}_{\mathrm{in}}\leftarrow\bm{r}
13:
repeat
\triangleright
inner power iteration
14:
\bm{r}_{\mathrm{prev}}\leftarrow\bm{r}_{\mathrm{in}}
15:
\bm{r}_{\mathrm{in}}\leftarrow(1-\alpha)\,\bm{M}\,\bm{r}_{\mathrm{prev}}+\alpha\,\bm{v}
16:
until
\|\bm{r}_{\mathrm{in}}-\bm{r}_{\mathrm{prev}}\|_{1}<\varepsilon
17:
\bm{r}\leftarrow\bm{r}_{\mathrm{in}}
18:
end
for
19:
return
\bm{r}
;  root cause
v^{*}=\arg\max_{i}\,r_{i}
3.6
Complexity Analysis
Each inner iteration performs one sparse matrix–vector product (
O(|E|)
) plus
O(N)
work for the teleportation term. Construction
of
\bm{M}
requires
O(|E|)
for the forward transitions,
O(|E|)
for the backward edges, and
O(N)
for self-loops and
row normalization. Total cost per incident is
O\bigl(n_{\mathrm{outer}}\cdot(K_{\mathrm{inner}}\cdot|E|+|E|)\bigr)
,
where
K_{\mathrm{inner}}
is the number of power-iteration steps (typically 15–50). All matrices are stored in CSR format, so memory
is
O(|E|+N)
.
Figure 1:
A simple example of eIRWR pipeline. Service
D
(root cause) fails and cascades symptoms backward to callers
B
and
C
(dashed arrows). However, the observed anomaly vector,
s_{obs}
, shows
B
as the loudest signal (a victim, not the cause). eIRWR builds the transition matrix, sharpens the restart (teleportation) vector, and runs power iteration to correctly identify
D
as the most probable root cause in the converged distribution
\bm{r}
.
3.7
Comparison with Personalized PageRank (PPR)
Basic IRWR and the PPR at the core of MicroRCA share the same power iteration and differ only by the resilience damping
of Eq. (2):
PPR:
\displaystyle\bm{r}^{(k+1)}=(1-\alpha)\,\bm{W}\,\bm{r}^{(k)}+\alpha\,\bm{s}_{\mathrm{obs}}
(12)
IRWR:
\displaystyle\bm{r}^{(k+1)}=(1-\alpha)\,\bm{M}_{R}\,\bm{r}^{(k)}+\alpha\,\bm{s}_{\mathrm{obs}},
(13)
with
\bm{M}_{R}=\mathrm{diag}(\bm{1}-\bm{R})\bm{W}
as in Eq. (2). Both walk on the same matrix
\bm{W}
and in the same direction; the only change is the multiplicative damping
\mathrm{diag}(\bm{1}-\bm{R})
. It is tempting to read this damping as a new “fault-propagation” model, but with uniform resilience it has a much simpler, and much less impressive, interpretation.
Proposition 3.1
(Resilience damping is an effective restart)
.
Let
R_{i}\equiv R
be uniform, so
\bm{M}_{R}=(1-R)\,\bm{W}
. Then the converged IRWR score with restart
\alpha
induces the same node ranking as PPR with restart
\alpha_{\mathrm{eff}}=1-(1-\alpha)(1-R)=\alpha+R-\alpha R.
(14)
Proof.
At convergence, Eq. (13) gives
\bm{r}=\alpha\bigl(\bm{I}-(1-\alpha)(1-R)\bm{W}\bigr)^{-1}\bm{s}_{\mathrm{obs}}
, and PPR with restart
\alpha_{\mathrm{eff}}
gives
\bm{r}^{\prime}=\alpha_{\mathrm{eff}}\bigl(\bm{I}-(1-\alpha_{\mathrm{eff}})\bm{W}\bigr)^{-1}\bm{s}_{\mathrm{obs}}
. Choosing
\alpha_{\mathrm{eff}}
as in Eq. (14) makes
(1-\alpha_{\mathrm{eff}})=(1-\alpha)(1-R)
, so
\bm{r}
and
\bm{r}^{\prime}
are equal up to the positive scalar
\alpha/\alpha_{\mathrm{eff}}
, which does not change the ranking.
∎
Remark 3.2
.
For this paper’s default
\alpha=0.15,\,R=0.1
, Eq. (14) gives
\alpha_{\mathrm{eff}}=1-(1-0.15)(1-0.1)=0.235
: basic IRWR is exactly PPR at restart
0.235
.
Proposition
3.1
shows that basic IRWR is not a new graph model at all. The ablation in Section
4.3
confirms this equality numerically and shows that walking on the true transpose
\bm{W}^{\top}
(a genuinely “backward” matrix) is in fact catastrophic. The consequence for evaluation is that basic IRWR must be benchmarked against a restart-tuned PPR, not the default; once that is done, its advantage disappears. The gains that remain, and they are large, come from the restart-shaping and structural mechanisms of eIRWR, which we now motivate.
On the example graph of Fig. 1 , this is the difference between a naive anomaly restart, which piles probability on the loudest victim
B
, and eIRWR’s sharpened, self-loop-augmented restart, which concentrates probability at the originating fault
D
.
3.8
Example
Fig. 1 illustrates the eIRWR pipeline on a small example graph. A fault at service
D
(the root cause) cascades backward through the dependency graph: callers
B
and
C
observe elevated latency, and their callers inherit weaker symptoms.
The observed anomaly vector
\bm{s}_{\mathrm{obs}}
(top-right) shows that the loudest signal is at node
B
(a victim), not at the true root cause
D
. By sharpening the restart onto the most self-contained anomaly and letting probability accumulate there via self-loops, the converged vector
\bm{r}
correctly identifies
D
as the most probable root cause.
4
Experimental Results
4.1
Experiment Setup
Dataset.
The Alibaba Microservice Trace Dataset (v2022)
[14]
provides distributed traces from a production cluster. We select three representative call-graph snapshots of increasing scale, see Table 2 .
Table 2:
Dataset characteristics for the three evaluation topologies.
Topology
Trace Rows
Nodes
Edges
Avg Deg.
CG84
8,469,061
12,453
30,742
2.47
CG136
15,415,374
17,842
56,185
3.15
CG297
20,605,953
24,952
87,914
3.52
Figure 2:
Traces from the Alibaba production cluster are aggregated into three call-graph topologies of increasing scale (top). For each topology, we simulate anomaly incidents by selecting a root cause and propagating faults backward with geometric decay (bottom left). The visibility parameter
v
controls how much anomaly signal the root cause
D
contributes to the observed vector
\bm{s}_{\mathrm{obs}}
: at
v\!=\!0
, the root cause is entirely masked by cascading symptoms; at
v\!=\!0.5
, it is the loudest signal.
Anomaly simulation.
For each topology, we simulate anomaly incidents by selecting a random callee node as the root cause and propagating a fault signal backward through the dependency graph. The propagation uses geometric decay (\gamma=0.6) over 5 hops, with additive Gaussian noise (\sigma=0.05).
The root-cause visibility parameter
v\in\{0.0,0.1,0.3,0.5\}
controls how visible the root cause is in the observed anomaly vector: at
v=0.0
, the root cause signal is entirely masked by cascading symptoms; at
v=0.5
, it is moderately visible. We run 200 incidents per topology at each visibility level; the same incidents (identical random seeds) are presented to every method, giving the paired design assumed by the significance tests in Section
4.2
. Fig. 2 depicts the end-to-end evaluation pipeline and the effect of the visibility parameter on the observed anomaly vector.
Baselines.
We compare against eight methods that, like ours, operate on aggregate anomaly vectors and the service-level call graph: MicroRCA
[11]
(PPR), CloudRanger
[12]
(second-order random walk), MonitorRank
[13]
(anomaly-correlated walk), Corr-Fusion (a correlation-fusion composite we construct in the spirit of MonitorRank: an anomaly-teleport walk on
\beta\,\bm{W}+(1-\beta)\,\bm{C}
, where
\bm{C}
scales each edge by the anomaly scores of both endpoints), In-Degree Centrality, MicroHECL
[17]
(backward traversal), TraceDiag
[18]
(pruning + PPR), and Neighbour Correlation (PAL/FChain-style [ 19, 20 ]).
We exclude trace-level methods (MicroRank [9] , TraceRank [10]) from the comparison because they require per-request span data, a fundamentally different and richer input signal. Under simulation, this difference is decisive: the per-trace pass/fail labels these methods consume are derived directly from the injected fault, so they behave as an oracle-informed upper bound (MicroRank, for example, attains MRR
\approx 0.9
even at zero root-cause visibility, where no aggregate-metric method can exceed MRR
=0.14
). Including them in the aggregate-metric comparison would conflate input richness with algorithmic merit; we therefore treat them as an upper bound on a strictly richer input signal.
Metrics.
We report Precision at Rank
k
(PR@ k , for k\in\{1,3,5\}), Mean Reciprocal Rank (MRR), and average rank of the true root cause.
All metrics are averaged over incidents within each topology, then averaged across the three topologies.
Parameters.
Unless stated otherwise, we use restart probability
\alpha=0.15
, base resilience
R_{\mathrm{base}}=0.1
, anomaly
sensitivity
\beta=2.0
, backward weight
\rho=0.3
, teleportation exponent
q=2.0
, momentum
\mu=0.1
, and convergence tolerance
\varepsilon=10^{-6}
.
These values were fixed during development on small synthetic graphs before the evaluation topologies were processed, and were not tuned on the evaluation incidents; the same values are used for all topologies and visibility levels.
4.2
Results
Table 3:
RCA performance averaged over three topologies (CG84, CG136, CG297).
v
denotes root-cause visibility.
v=0.0
v=0.1
v=0.3
v=0.5
Method
PR@1
PR@5
MRR
PR@1
PR@5
MRR
PR@1
PR@5
MRR
PR@1
PR@5
MRR
MicroRCA
0.02
0.09
0.06
0.04
0.16
0.11
0.17
0.34
0.26
0.34
0.55
0.46
CloudRanger
0.00
0.01
0.00
0.00
0.01
0.01
0.00
0.01
0.01
0.01
0.01
0.01
MonitorRank
0.02
0.10
0.06
0.05
0.16
0.11
0.17
0.35
0.27
0.35
0.54
0.46
Corr-Fusion
0.02
0.09
0.06
0.05
0.16
0.11
0.17
0.35
0.27
0.34
0.55
0.46
In-Degree
0.00
0.00
0.00
0.00
0.00
0.00
0.00
0.00
0.00
0.00
0.00
0.00
MicroHECL
0.07
0.17
0.12
0.07
0.18
0.12
0.08
0.18
0.13
0.08
0.18
0.13
TraceDiag
0.02
0.05
0.04
0.03
0.10
0.08
0.10
0.25
0.18
0.25
0.44
0.35
Neigh. Corr.
0.00
0.00
0.00
0.00
0.00
0.01
0.00
0.01
0.01
0.00
0.01
0.02
IRWR
0.03
0.18
0.10
0.07
0.31
0.19
0.40
0.58
0.50
0.71
0.98
0.83
eIRWR
0.03
0.27
0.14
0.05
0.34
0.19
0.58
0.95
0.75
0.90
0.99
0.94
Figure 3:
MRR vs root-cause visibility, averaged over three topologies. eIRWR consistently outperforms all aggregate-metric baselines across all visibility levels, with the gap widening as the root cause becomes more
visible.
Table 3 presents the main comparison.
Fig. 3 shows MRR as a function of root-cause visibility, averaged across the three topologies.
eIRWR outperforms all baselines by a wide margin. At moderate visibility (v=0.3), eIRWR achieves MRR
=0.75
and PR@1
=0.58
, compared to the best aggregate-metric baseline (MonitorRank/Corr-Fusion, MRR =0.27 , PR@1 =0.17), a
\mathbf{2.8×}
improvement in MRR. At
v=0.5
, eIRWR reaches MRR
=0.94
and PR@1
=0.90
, correctly identifying the root cause as the top-ranked service in
90\%
of incidents.
The enhancements, not the transition matrix, drive the gain. Basic IRWR improves on MicroRCA at
v=0.3
(MRR 0.50 vs. 0.26), but the ablation of Section 4.3 shows this is entirely an effective-restart effect: a restart-tuned PPR matches basic IRWR exactly (Proposition 1). The gain that survives a tuned baseline comes from eIRWR’s restart sharpening and structural augmentation. These lift MRR from 0.50 to 0.75 at
v=0.3
, PR@5 from 0.58 to 0.95, and PR@1 from 0.40 to 0.58. eIRWR does not merely nudge scores but reliably surfaces the true cause into the shortlist. At
v=0.1
it reduces the average rank of the true root cause from 688 to 202.
Structural and sampling baselines collapse at scale. In-Degree Centrality, CloudRanger, and Neighbour Correlation achieve near-zero MRR (<0.02) at every visibility level, and MicroHECL is non-trivial but flat (MRR \approx 0.12 regardless of visibility). We analyze these failure modes in Section 5.
4.3
Ablation
To attribute the improvement correctly, we decompose our method into the components claimed by prior work and by us. Each variant is evaluated on the same CG84 incidents (200 per visibility, seed 42)
with the same graph; Table 4 reports the result. Three conclusions follow. A single seed on one topology suffices here because the ablation is diagnostic rather than comparative: the second conclusion is an exact algebraic identity (Proposition 3.1) that holds on any graph, and Table 5 confirms that the headline gain transfers to CG136 and CG297.
Table 4:
Ablation on CG84 (MRR, 200 incidents/level, seed 42). All variants use
\alpha=0.15
unless noted. “
\bm{W}^{\top}
” walks on the true transpose; “
\bm{M}_{R}
” is the resilience-damped matrix (R=0.1).
Variant
v{=}0.1
v{=}0.3
v{=}0.5
MicroRCA: PPR on
\bm{W}
0.14
0.28
0.47
PPR on true transpose
\bm{W}^{\top}
0.01
0.01
0.02
Basic IRWR on
\bm{M}_{R}
(R{=}0.1)
0.20
0.55
0.84
PPR on
\bm{W}
, tuned
\alpha{=}0.235
0.20
0.55
0.84
eIRWR (full)
0.20
0.77
0.92
“Backward direction” is not the mechanism.
Walking on the genuine transpose
\bm{W}^{\top}
, which propagates caller
\to
callee and pushes mass toward leaf services, is catastrophic (MRR \approx 0.01). MicroRCA’s PPR on
\bm{W}
already accumulates callee scores into callers; there is no additional “backward” matrix to be had.
Resilience damping is an effective restart. Basic IRWR (\bm{M}_{R}, R=0.1) and PPR with
\alpha_{\mathrm{eff}}=0.235
produce identical MRR at every visibility (0.20/0.55/0.84), exactly as Proposition
3.1
predicts (
1-(1{-}0.15)(1{-}0.1)=0.235
). The entire IRWR-over-MicroRCA gain is a restart-rate effect that a practitioner obtains for free by tuning
\alpha
; it is not evidence of a new fault-propagation model.
The surviving gain is eIRWR’s. Against the strong, restart-tuned baseline (0.55 at v=0.3), eIRWR still improves MRR to
0.77
(+40\%) through teleportation sharpening, self-loops, and backward-edge augmentation.
We note that the anomaly-conditioned resilience (Section 3.4.1) contributes little on its own (varying \beta over [0,10] moves MRR by <0.001); the dominant enhancement is
the restart shaping.
4.4
Cross-topology Generalization
Table 5:
MRR at
v=0.3
for each topology.
Method
CG84
CG136
CG297
Mean
MicroRCA
0.28
0.25
0.25
0.26
MonitorRank
0.29
0.25
0.26
0.27
Corr-Fusion
0.29
0.25
0.26
0.27
TraceDiag
0.21
0.17
0.16
0.18
IRWR
0.51
0.48
0.52
0.50
eIRWR
0.76
0.77
0.73
0.75
Figure 4:
MRR by method across three topologies at
v=0.3
. eIRWR maintains strong performance across all scales, while the gap to baselines widens on larger graphs.
eIRWR attains MRR
\geq 0.73
on all three topologies, with no systematic degradation as the graph grows from 12K to 25K nodes. The best aggregate-metric baseline never exceeds MRR
=0.29
.
Table 5 and Fig. 4 give the per-topology breakdown; CloudRanger, In-Degree, MicroHECL, and Neighbor Correlation achieve near-zero or flat performance on all three graphs and are omitted from the table for brevity.
Table 6:
Wilcoxon signed-rank tests: eIRWR vs. each baseline at
v=0.3
.
r
= effect
size.
Baseline
p
-value
r
Sig. (\alpha\!=\!0.05)
MicroRCA
9.2× 10^{-24}
0.75
Yes
CloudRanger
7.2× 10^{-35}
0.87
Yes
MonitorRank
5.2× 10^{-23}
0.76
Yes
Corr-Fusion
3.2× 10^{-23}
0.74
Yes
In-Degree
7.2× 10^{-35}
0.87
Yes
MicroHECL
3.8× 10^{-31}
0.83
Yes
TraceDiag
1.1× 10^{-27}
0.81
Yes
Neigh. Corr.
5.7× 10^{-34}
0.86
Yes
IRWR
2.9× 10^{-9}
0.60
Yes
The Friedman test rejects the equality of all methods at every visibility level (p<10^{-200}). Paired Wilcoxon signed-rank tests confirm that eIRWR outperforms every baseline at
v=0.3
(p<10^{-8}). Effect sizes are
r\geq 0.74
against all literature baselines and
r=0.60
against basic IRWR (Table 6 , computed over 200 incidents on CG297).
4.5
Computational Efficiency
Fig. 5 shows runtime and peak memory as a
function of graph size. Table 7 reports values
at the largest scale of the runtime sweep (17,468 nodes, 55,125 edges).
The scalability sweep is constructed from CG297, the largest topology: we rebuild the dependency graph from increasing prefixes of its call-graph trace (10^{5} to 5× 10^{6} records), yielding graphs of 3,971 to 17,468 nodes (55,125 edges at the largest point). The largest sweep point remains below CG297’s full size in Table 2 (24,952 nodes) because node count grows sub-linearly in the number of records: later records increasingly revisit services already present in the graph. CG84 and CG136 are not swept separately, since the sweep’s purpose is to isolate the effect of graph size under a fixed topology, and their full sizes (12,453 and 17,842 nodes) already lie within the swept range.
Figure 5:
(a) Runtime vs. graph size and (b) peak memory vs. graph size. IRWR has comparable cost to MicroRCA; eIRWR is
\approx 4×
slower due to the outer belief loop and backward transitions, but remains under 25 ms even at 17K nodes.
Table 7:
Computational cost at the largest scale of the runtime sweep (N=17,468, |E|=55,125).
Method
Time (ms)
Memory (MB)
MicroRCA
5.6
0.5
CloudRanger
12,012.7
0.4
TraceDiag
3.6
0.8
IRWR
4.8
0.5
eIRWR
22.6
7.2
IRWR runs in 4.8 ms, comparable to MicroRCA (5.6 ms) and TraceDiag (3.6 ms). This is expected since all three perform sparse power iteration; the difference is the transition matrix (\bm{M}_{R} vs. \bm{W}). eIRWR takes 22.6 ms due to the additional construction of backward transitions and self-loops, but this remains well within operational latency budgets for online RCA systems. CloudRanger is orders of magnitude slower ({\sim}12 s). Covering a 17K-node graph requires 50,000 sampled walks of length 20 per incident, and even then most nodes receive no visits. Fig. 6 shows the number of iterations to convergence as a function of the restart probability
\alpha
. At the default
\alpha=0.15
, IRWR converges in
{\sim}28
iterations and eIRWR in
{\sim}65
iterations. Higher
\alpha
yields faster convergence at the cost of reduced exploration depth.
Figure 6:
Iterations to convergence vs. restart probability
\alpha
for IRWR and eIRWR. Error bars show
\pm 1
standard deviation across 20 incidents.
(N=10,688 nodes, one of the induced subgraphs from the scalability sweep of Fig. 5).
4.6
Real-Anomaly-Window Case Study
The controlled evaluation uses simulated incidents so that ground-truth labels exist. As a complementary check on real data, we extract three anomaly windows directly from the CG297 production traces (using elevated response time and microservice call rate to define \bm{s}_{\mathrm{obs}}) and inspect which service each method nominates.
Because the true root cause is unknown, we cannot report PR@
k
. Instead, we characterize each method’s top-1 pick with two label-free diagnostics. The downstream-anomaly-ratio is the fraction of the pick’s callees that are themselves anomalous; it is high for a deep victim whose sub-tree is uniformly hot.
The cascade coverage is the fraction of the observed cascade that a failure at the pick would explain; it is high for a plausible source.
Both diagnostics measure source-likeness, the property eIRWR is designed to optimize, so they characterize the qualitative behavior of each method rather than serving as neutral accuracy measures.
Table 8:
Real-anomaly windows on CG297 (no ground-truth labels). Cascade coverage of the top-1 service; higher indicates a more source-like nomination.
Method
Win. 1
Win. 2
Win. 3
MicroRCA
0.001
0.002
0.001
Corr-Fusion
0.001
0.002
0.001
MicroHECL
0.001
0.002
0.001
eIRWR
0.56
0.58
0.001
The pattern (Table 8 ) is consistent with the controlled results. The PPR and traversal baselines nominate services whose entire downstream sub-tree is already anomalous (downstream-anomaly-ratio \approx 0.9) yet which explain almost none of the cascade: the signature of a deep victim near the leaves.
eIRWR instead nominates upstream, source-like services (downstream-anomaly-ratio \approx 0.07). In two of the three windows, its pick accounts for more than half of the observed cascade.
The third window is inconclusive for all methods, illustrating that unlabeled real data can neither confirm nor refute a nomination.
5
Discussion
eIRWR’s accuracy comes from shaping the restart, not from a new transition matrix. Transposing the walk is counter-productive, and uniform resilience damping is algebraically a higher restart rate. What works is concentrating restart mass on the most suspicious nodes (power-law sharpening), letting probability accumulate at cascade sources (self-loops), and allowing limited upstream exploration (backward edges). These control where the walk restarts and lingers, the axis along which a root cause differs from its louder victims.
eIRWR’s gain over a restart-tuned PPR is largest at
v=0.3
(MRR 0.50\to 0.75 ; PR@5 0.58\to 0.95). At high visibility, the root cause is already the loudest signal, so a tuned restart nearly suffices. At very low visibility, the source emits almost no signal for sharpening to use. In between, the source is present but buried under victims. There, concentrating the restart on the sharpest, most self-contained anomaly separates cause from victim. This is where operational RCA is hardest and most valuable.
At
v=0.0
only victims show symptoms, and every aggregate-metric method is limited. eIRWR reaches MRR
=0.14
, modestly above the best baseline (MicroHECL, 0.12 ; Table 3). Trace-level methods (MicroRank [9] , TraceRank [10]) stay robust here through per-request pass/fail evidence, at the cost of richer instrumentation. We treat them as an upper bound on a strictly richer input, not as competitors.
The baselines show three failure profiles. In-Degree Centrality is anomaly-unaware and ranks every incident identically; since root causes are rarely the highest-traffic services, its MRR stays below
0.001
. CloudRanger’s sampled walks cannot cover a 25K-node graph, so most nodes go unvisited, and tie-breaking dominates the ranking (MRR <0.02). MicroHECL retains a usable but flat signal (MRR \approx 0.12). Its fixed-depth traversal neither converges nor re-injects the observed anomaly, so extra visibility never changes its ranking; it marks the ceiling of non-iterative traversal. The PPR family (MicroRCA, MonitorRank, Corr-Fusion) is the strongest but under-restarts. Seeded with the raw anomaly vector, the walk keeps re-injecting mass at the loudest victims, so probability settles on symptoms rather than the source. Raising the effective restart helps, as the ablation showed. Reshaping it, as eIRWR does, is the qualitative fix.
Scaling RCA to production topologies rewards anomaly-guided scoring, iterative convergence, and a restart distribution shaped to separate sources from victims. The PPR family provides the first two. The third is where eIRWR advances, and it tracks the cause–victim distinction that defines the RCA problem.
6
Conclusion
In this paper, we investigated the localization capabilities of anomaly-restart random walks and identified the key mechanisms that drive their effectiveness.
Our findings reveal that common methods credited for improving RCA accuracy, e.g., transposing the transition matrix and uniform resilience damping – contribute no genuine localization gain: the former is counter-productive, and the latter reduces to a higher restart rate.
Instead, the real enhancement stems from techniques like power-law teleportation sharpening and belief refinement, which effectively concentrate probability on cascade sources rather than downstream effects.
On three Alibaba topologies, eIRWR achieves MRR
=0.75
at moderate root-cause visibility (a 2.8 times improvement over the best aggregate-metric baseline) and
0.94
at high visibility. It runs in under 25 ms on graphs of 17,000 nodes.
We acknowledge three limitations. First, our simulated incidents, while informative, do not fully represent real-world complexities such as partial failures and retries. Second, all aggregate-metric methods, including ours, face a ceiling at zero visibility, where trace-level methods provide a superior baseline. Lastly, eIRWR incurs a cost approximately four times that of basic PPR, making tuned PPR a more viable option under strict latency constraints.
These limitations suggest several avenues for future work: learning per-service resilience from historical incidents, establishing a labeled real-incident benchmark, exploring temporal dynamics in the restart distribution, and combining restart shaping with lightweight trace sampling to recover some trace-level advantage at low visibility.
References
D. Monteiro, P. H. M. Maia, L. S. Rocha, and N. C. Mendonça
(2020)
Building orchestrated microservice systems using declarative business processes
.
Service Oriented Computing and Applications
14
(4),
pp. 243–268
.
Cited by:
§1
.
Y. Wang, S. Ma, Y. Lai, and Y. Liang
(2023)
Qualitative and quantitative comparison of Spring Cloud and Kubernetes in migrating from a monolithic to a microservice architecture
.
Service Oriented Computing and Applications
17
(3),
pp. 149–159
.
Cited by:
§1
.
S. Khan, P. H. Nguyen, A. Abdul-Rahman, E. Freeman, C. Turkay, and M. Chen
(2022)
Rapid Development of a Data Visualization Service in an Emergency Response
.
IEEE Trans. on Services Computing
15
(3),
pp. 1251–1264
.
Cited by:
§1
.
S. Khan and D. Wallom
(2022)
A System for Organizing, Collecting, and Presenting Open-Source Intelligence
.
Journal of Data, Info. and Management
4
(2),
pp. 107–117
.
Cited by:
§1
.
S. Khan, J. Chakraborty, P. Beaucamp, N. Bhujel, and M. Chen
(2026)
Data Virtualization for Machine Learning
.
In
Services Computing – SCC 2025
,
pp. 69–84
.
Cited by:
§1
.
S. Khan, E. Rydow, S. Etemaditajbakhsh, K. Adamek, and W. Armour
(2023)
Web Performance Evaluation of High Volume Streaming Data Visualization
.
IEEE Access
11
,
pp. 15623–15636
.
Cited by:
§1
.
A. Khedimi, T. Menouer, C. Cérin, and K. Boukhalfa
(2022)
A cloud weather forecasting service and its relationship with anomaly detection
.
Service Oriented Computing and Applications
16
,
pp. 191–208
.
Cited by:
§1
,
§2.4
.
S. H. Ahmadpanah, M. Mirabi, and S. Sobhanloo
(2026)
eBPF-shield: autonomous anomaly detection and proactive Hybrid In-kernel remediation for cloud-native systems
.
Service Oriented Computing and Applications
.
Cited by:
§1
,
§2.4
.
G. Yu, P. Chen, H. Chen, Z. Guan, Z. Huang, L. Jing, T. Weng, X. Sun, and X. Li
(2021)
MicroRank: End-to-End Latency Issue Localization with Extended Spectrum Analysis in Microservice Environments
.
pp. 3087–3098
.
External Links:
ISBN 9781450383127
Cited by:
§1
,
§2.3
,
§4.1
,
§5
.
G. Yu, Z. Huang, and P. Chen
(2023)
TraceRank: Abnormal service localization with dis-aggregated end-to-end tracing data in cloud native systems
.
Journal of Software: Evolution and Process
35
(10),
pp. e2413
.
Cited by:
§1
,
§2.3
,
§4.1
,
§5
.
L. Wu, J. Tordsson, E. Elmroth, and O. Kao
(2020)
MicroRCA: Root Cause Localization of Performance Issues in Microservices
.
In
IEEE/IFIP Network Operations and Management Symp. (NOMS 2020)
,
pp. 1–9
.
External Links:
ISSN 2374-9709
Cited by:
§1
,
§2.1
,
§4.1
.
P. Wang, J. Xu, M. Ma, W. Lin, D. Pan, Y. Wang, and P. Chen
(2018)
CloudRanger: Root Cause Identification for Cloud Native Systems
.
In
2018 18th IEEE/ACM Int. Symp. on Cluster, Cloud and Grid Computing (CCGRID)
,
Vol.
,
pp. 492–502
.
Cited by:
§1
,
§2.1
,
§4.1
.
M. Kim, R. Sumbaly, and S. Shah
(2013)
Root cause detection in a service-oriented architecture
.
SIGMETRICS Perform. Eval. Rev.
41
(1),
pp. 93–104
.
External Links:
ISSN 0163-5999
Cited by:
§1
,
§2.1
,
§4.1
.
Alibaba Group
(2022)
Microservice Trace Dataset v2022
.
Note:
https://github.com/alibaba/clusterdata/tree/master/cluster-trace-microservices-v2022
Cited by:
item (c)
,
§3.2
,
§4.1
.
J. Soldani and A. Brogi
(2022)
Anomaly Detection and Failure Root Cause Analysis in (Micro) Service-Based Cloud Applications: A Survey
.
ACM Comput. Surv.
55
(3).
Cited by:
§2
.
S. Brin and L. Page
(1998)
The anatomy of a large-scale hypertextual Web search engine
.
Vol.
30
,
pp. 107–117
.
Note:
WWW
External Links:
ISSN 0169-7552
Cited by:
§2.1
.
D. Liu, C. He, X. Peng, F. Lin, C. Zhang, S. Gong, Z. Li, J. Ou, and Z. Wu
(2021)
MicroHECL: High-Efficient Root Cause Localization in Large-Scale Microservice Systems
.
In
2021 IEEE/ACM 43rd Int. Conf. on Software Engineering: Software Engineering in Practice (ICSE-SEIP)
,
Vol.
,
pp. 338–347
.
Cited by:
§2.2
,
§4.1
.
R. Ding, C. Zhang, L. Wang, Y. Xu, M. Ma, X. Wu, M. Zhang, Q. Chen, X. Gao, X. Gao, H. Fan, S. Rajmohan, Q. Lin, and D. Zhang
(2023)
TraceDiag: adaptive, interpretable, and efficient root cause analysis on large-scale microservice systems
.
In
Proc. of the 31st ACM Joint European Software Engineering Conf. and Symp. on the Foundations of Software Engineering
,
ESEC/FSE 2023
,
pp. 1762–1773
.
Cited by:
§2.2
,
§4.1
.
H. Nguyen, Y. Tan, and X. Gu
(2011)
PAL: Propagation-aware Anomaly Localization for cloud hosted distributed applications
.
In
Managing Large-Scale Systems via the Analysis of System Logs and the Application of Machine Learning Techniques
,
SLAML ’11
.
External Links:
ISBN 9781450309783
Cited by:
§2.3
,
§4.1
.
H. Nguyen, Z. Shen, Y. Tan, and X. Gu
(2013)
FChain: Toward Black-Box Online Fault Localization for Cloud Systems
.
In
2013 IEEE 33rd Int. Conf. on Distributed Computing Systems
,
Vol.
,
pp. 21–30
.
Cited by:
§2.3
,
§4.1
.
G. P. Bhandari and R. Gupta
(2020)
Fault diagnosis in service-oriented computing through partially observed stochastic Petri nets
.
Service Oriented Computing and Applications
14
(1),
pp. 35–47
.
Cited by:
§2.4
.
Á. Brandón, M. Solé, A. Huélamo, D. Solans, M. S. Pérez, and V. Muntés-Mulero
(2020)
Graph-based root cause analysis for service-oriented and microservice architectures
.
Journal of Systems and Software
159
,
pp. 110432
.
Cited by:
§2.4
.
L. Wu, J. Bogatinovski, S. Nedelkoski, J. Tordsson, and O. Kao
(2021)
Performance diagnosis in cloud microservices using deep learning
.
In
Service-Oriented Computing – ICSOC 2020 Workshops
,
pp. 85–96
.
Cited by:
§2.4
.