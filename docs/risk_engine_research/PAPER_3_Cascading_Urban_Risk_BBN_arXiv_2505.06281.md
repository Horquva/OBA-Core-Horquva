# A Data-Driven Probabilistic Framework for Cascading Urban Risk Analysis Using Bayesian Networks

**Authors**: Chunduru Rohith Kumar, PHD Surya Shanmuk, Prabhala Naga Srinivas, Sri Venkatesh Lankalapalli, Debasis Dwibedy  
**arXiv ID**: [arXiv:2505.06281](https://arxiv.org/abs/arxiv_id)  
**Published Date**: May 7, 2025  

---

## A Data-Driven Probabilistic Framework for Cascading Urban Risk Analysis Using Bayesian Networks

The increasing complexity of cascading risks in urban systems necessitates robust, data-driven frameworks to model interdependencies across multiple domains. This study presents a foundational Bayesian network–based approach for analyzing cross-domain risk propagation across key urban domains including air, water, electricity, agriculture, health, infrastructure, weather, and climate. Directed Acyclic Graphs (DAGs) are constructed using Bayesian Belief Networks (BBNs), with structure learning guided by Hill-Climbing search optimized through Bayesian Information Criterion (BIC) and K2 scoring. The framework is trained on a hybrid dataset that combines real-world urban indicators with synthetically generated data from Generative Adversarial Networks (GANs), and is further balanced using the Synthetic Minority Over-sampling Technique (SMOTE). Conditional Probability Tables (CPTs) derived from the learned structures enable interpretable probabilistic reasoning and quantify the likelihood of cascading failures. The results identify key intra and inter-domain risk factors and demonstrate the framework’s utility for proactive urban resilience planning. This work establishes a scalable, interpretable foundation for cascading risk assessment and serves as a basis for future empirical research in this emerging interdisciplinary field.

### 1 Introduction

The accelerated development of urban systems, augmented by integrated digital technologies, aims to enhance infrastructure, service delivery, and quality of life [2]. However, this interconnectivity also introduces systemic vulnerabilities. In particular, cascading failures, where a disruption in one subsystem triggers a chain reaction across other dependent systems, have emerged as a significant concern [3, 4]. For instance, a power outage can impair water distribution, disrupt emergency medical services, and compound existing environmental stressors, leading to wide-scale urban dysfunction [2]. Research Motivation. Traditional risk assessment models often operate in silos, focusing on domain-specific threats without accounting for the interdependencies between urban subsystems [8]. Such limitations hinder proactive risk management, especially in complex, hyper-connected ecosystems where secondary effects can be more disruptive than the primary incident itself [1, 5]. As cities become smarter and more interconnected, the vulnerability to these multi-domain cascading risks becomes more pronounced. Our Contribution. To address the above-mentioned challenges, we introduce a novel data-driven probabilistic framework for modeling and analysing cascading risk events across urban city domains using Bayesian Belief Networks (BBNs). We employ structure learning algorithms, specifically the Hill-Climbing method optimized via Bayesian Information Criterion (BIC) and K2 scoring to construct Directed Acyclic Graphs (DAGs) that capture causal dependencies among risk factors. The datasets used include real-world urban indicators from sources such as NDAP and OpenCity, which are further augmented through synthetically generated records using Generative Adversarial Networks (GANs). To handle the data imbalance issue and improve coverage, we incorporate the Synthetic Minority Over-sampling Technique (SMOTE). The resulting Conditional Probability Tables (CPTs) allow interpretable estimation of cascading failures across domains such as water, air, electricity, agriculture, health, and infrastructure. Our approach is distinguished by its ability to integrate real and synthetic data, uncover both intra and inter-domain dependencies, and provide quantified, interpretable risk estimates that support proactive urban planning. These insights are directly applicable in energy management, healthcare, disaster preparedness, and infrastructure resilience. Overall, we aim to offer a scalable and empirically validated tool for system-wide risk inference in urban cities, enabling decision-makers to anticipate and mitigate the impact of cascading failures. Paper Organization. The remaining sections of the paper is organized as follows. In Section 2, we present key definitions and relevant background, including a review of prior work on Bayesian Networks and cascading risk modeling. Section 3 formally defines the problem statement. Section 4 details the proposed methodology, including data acquisition, synthetic data generation using GANs, data preprocessing, network structure learning, and probabilistic inference through Conditional Probability Tables. In Section 5, we present the experimental results, graphical representations of inter and intra-domain risk propagation, and interpretations of key findings. We conclude the paper in Section 6 with a summary of the main contributions and a discussion on potential future research directions.

### 2 Background Studies

#### 2.1 Basic Terminologies, Notations, and Definitions

Here, we define key terms, definitions and notations frequently used throughout the paper.

- • Risk Factor (RF): A quantitative metric that represents the likelihood of an adverse event occurring within a specific domain. For example, in the context of urban cities, critical risk factors include air quality index, traffic density, and the status of water resources [3].

Risk Factor (RF): A quantitative metric that represents the likelihood of an adverse event occurring within a specific domain. For example, in the context of urban cities, critical risk factors include air quality index, traffic density, and the status of water resources [3].

- • Cascading Events: A sequence of events where an initial disruption in one domain triggers subsequent failures in interconnected systems. In urban cities, for example, a pollution spike can impact public health, or traffic congestion may elevate emission levels [1].

Cascading Events: A sequence of events where an initial disruption in one domain triggers subsequent failures in interconnected systems. In urban cities, for example, a pollution spike can impact public health, or traffic congestion may elevate emission levels [1].

- • Domain (D): Distinct domains of a urban city such as transportation, healthcare, natural resources (sub-domains: water, air, electricity, agriculture), and climate. Each domain is evaluated for risk exposure and its potential to influence other domains through cascading effects [2].

Domain (D): Distinct domains of a urban city such as transportation, healthcare, natural resources (sub-domains: water, air, electricity, agriculture), and climate. Each domain is evaluated for risk exposure and its potential to influence other domains through cascading effects [2].

- • Generative Adversarial Network (GAN): A machine learning framework used to create synthetic datasets that reflect the statistical patterns of real data. In this study, GANs are utilized to simulate domain-specific data, such as correlations between air pollution levels and health outcomes [10].

Generative Adversarial Network (GAN): A machine learning framework used to create synthetic datasets that reflect the statistical patterns of real data. In this study, GANs are utilized to simulate domain-specific data, such as correlations between air pollution levels and health outcomes [10].

- • Synthetic Minority Over-sampling Technique (SMOTE): A re-sampling technique applied to imbalanced datasets to generate synthetic data for minority classes. In our methodology, SMOTE is used to balance the dataset before integrating it with GAN-generated synthetic data [5].

Synthetic Minority Over-sampling Technique (SMOTE): A re-sampling technique applied to imbalanced datasets to generate synthetic data for minority classes. In our methodology, SMOTE is used to balance the dataset before integrating it with GAN-generated synthetic data [5].

- • Probability of Cascading Events (PCE): A probabilistic metric that estimates the likelihood of a cascading failure occurring in a specific domain due to the influence of a primary risk factor. This metric forms the foundation for predicting chain reactions across systems in urban cities [18].

Probability of Cascading Events (PCE): A probabilistic metric that estimates the likelihood of a cascading failure occurring in a specific domain due to the influence of a primary risk factor. This metric forms the foundation for predicting chain reactions across systems in urban cities [18].

#### 2.2 Literature Survey

Bayesian Networks (BNs) have been widely adopted in recent years to model complex dependencies among variables, particularly in fields where uncertainty and interrelationships are critical. Song et al. [16] applied the Max-Min Hill-Climbing (MMHC) algorithm to construct BNs for analyzing multimorbidity using longitudinal health data from over 19,000 individuals. Their study demonstrated that BNs could effectively capture both direct and indirect causal dependencies among variables such as sleep duration, age, and physical activity, offering advantages over traditional logistic regression models in revealing complex interrelationships. Although their focus was limited to clinical decision-making and statistical association, the methodological insight into structure learning with CPTs and probabilistic inference is pertinent to risk modeling across domains. Complementing this, Adhitama et al. [17] used a score-based Hill-Climbing algorithm, optimized via Bayesian Information Criterion (BIC) to model dependencies among 52 symptoms and 15 eye diseases. The resulting BN comprising 93 edges and 65 nodes enabled probabilistic diagnostic reasoning and achieved a minimal BIC score after iterative refinement. This study further reinforces the efficacy of structure learning techniques, such as BIC scoring, in constructing interpretable and domain-specific probabilistic models.
While these works primarily address healthcare-centric or domain-restricted problems, they provide a foundation for extending BNs to broader applications, such as multi-domain cascading risks in urban cities. Our work builds on these methodologies by integrating cross-domain real and synthetic datasets, and adapting BN-based modeling to represent interdependencies across heterogeneous urban systems like water, air, electricity, and health. Unlike the cited studies, which focus on single-domain scenarios, we contribute a generalized and scalable probabilistic framework tailored to the complexity of interconnected urban infrastructures.
Although Bayesian Networks have been applied in various domains, there is a notable scarcity of research explicitly addressing data-driven cascading risk analysis in interconnected urban systems. Most existing works either examine isolated domains or employ expert-driven frameworks with limited scalability. We believe this work to be among the initial attempts at developing an integrated probabilistic model using real and synthetic data sources to infer cascading risks across multiple urban domains. We thus aim to set a methodological foundation for future advancements in this emerging interdisciplinary area.

### 3 Problem Statement

In urban cities, domains such as air quality, water availability, energy infrastructure, public health, and agriculture are deeply interconnected. A disruption in one domain can propagate to others, resulting in cascading failures. The challenge is to model these interdependencies in a data-driven and interpretable manner, such that potential risk propagation paths can be identified and quantified in advance. Formally, we define the problem as follows:

- • Input: Multi-modal real and synthetic datasets from Urban city domains including Air, Water, Electricity, Agriculture, Weather, Climate, Health, and Infrastructure. We denote the datasets as follows: $\mathbf{D}=\{D_{\text{Air}},D_{\text{Water}},D_{\text{Electricity}},D_{\text{Agriculture}},D_{\text{Weather\_Climate}},D_{\text{Health}},D_{\text{Infrastructure}}\}$

Input: Multi-modal real and synthetic datasets from Urban city domains including Air, Water, Electricity, Agriculture, Weather, Climate, Health, and Infrastructure. We denote the datasets as follows:

> *[Table]*: $\mathbf{D}=\{D_{\text{Air}},D_{\text{Water}},D_{\text{Electricity}},D_{\text{Agriculture}},D_{\text{Weather\_Climate}},D_{\text{Health}},D_{\text{Infrastructure}}\}$

- • Expected Output: Probabilistic estimates of cascading risk propagation pathways across domains, represented through interpretable structures such as Directed Acyclic Graphs (DAGs) and Conditional Probability Tables (CPTs).

Expected Output: Probabilistic estimates of cascading risk propagation pathways across domains, represented through interpretable structures such as Directed Acyclic Graphs (DAGs) and Conditional Probability Tables (CPTs).

- • Objective: To develop a data-driven probabilistic framework that can learn cross-domain dependencies and infer the likelihood of cascading failures, enabling early warning and proactive risk management in urban cities.

Objective: To develop a data-driven probabilistic framework that can learn cross-domain dependencies and infer the likelihood of cascading failures, enabling early warning and proactive risk management in urban cities.

### 4 Our Proposed Framework

The various phases of our proposed framework is depicted in Figure 1.

> *[Figure]*: Figure 1: Phases of the Proposed Cascading Risk Modeling Framework

- • Data Collection and Dataset Generation. We consider eight critical domains such as air, water, electricity, agriculture, health, infrastructure, weather and climate and for each domain we identify relevant risk indicators. We collect 10 data tuples for every domain from official government sources such as National Data and Analytics Platform (NDAP) and OpenCity. To enrich the dataset and improve its statistical coverage, we employ a Conditional Generative Adversarial Network (cGAN) to generate synthetic data that preserves the domain-specific distributions and interdependencies. To handle the class imbalance issues in the collected data, we apply the Synthetic Minority Oversampling Technique (SMOTE), ensuring balanced representation across high-risk and low-risk instances. Our final dataset captures both intra and inter-domain variations and is publicly available at: https://github.com/Srinivas-2004/Cascading-Risk-Prediction.

Data Collection and Dataset Generation. We consider eight critical domains such as air, water, electricity, agriculture, health, infrastructure, weather and climate and for each domain we identify relevant risk indicators. We collect 10 data tuples for every domain from official government sources such as National Data and Analytics Platform (NDAP) and OpenCity. To enrich the dataset and improve its statistical coverage, we employ a Conditional Generative Adversarial Network (cGAN) to generate synthetic data that preserves the domain-specific distributions and interdependencies. To handle the class imbalance issues in the collected data, we apply the Synthetic Minority Oversampling Technique (SMOTE), ensuring balanced representation across high-risk and low-risk instances. Our final dataset captures both intra and inter-domain variations and is publicly available at: https://github.com/Srinivas-2004/Cascading-Risk-Prediction.

- • Data Preprocessing. To facilitate binary risk modeling, we convert all numerical features into categorical risk indicators, assigning 1 to high-risk values and 0 to low-risk ones. This binarization enhances interpretability and supports clear threshold-based intervention analysis.

Data Preprocessing. To facilitate binary risk modeling, we convert all numerical features into categorical risk indicators, assigning 1 to high-risk values and 0 to low-risk ones. This binarization enhances interpretability and supports clear threshold-based intervention analysis.

- • Structure Learning and DAG Construction. We use a Bayesian Belief Network (BBN) to model causal dependencies among domain-specific attributes. A Directed Acyclic Graph (DAG) is constructed using the Hill-Climbing algorithm, a score-based structure learning approach. The algorithm iteratively refines the graph to maximize a scoring criterion, starting from an initial configuration and performing local modifications until convergence. – Node-Relationship Analysis. We evaluate candidate graph structures using two well-known scoring functions such as Bayesian Information Criterion (BIC) Score and K2 Score. The functions are formally defined below. $BIC=-2*ln(L)+k*ln(n)$ (1) where L denote the model likelihood, k denote the number of parameters, and n denote the number of data samples. Lower BIC values indicate better models. K2 Score: $K2=\prod_{i=1}^{N}\prod_{j=1}^{q_{i}}\frac{(N_{ij}-1)!}{\prod_{k=1}^{r_{i}}N_{ijk}!}\cdot\frac{(r_{i}-1)!}{(N_{ij}+r_{i}-1)!}$ (2) where, G denote the Bayesian network structure (graph), D denote the dataset, n is the number of nodes (variables), $q_{i}$ denote the number of unique parent configurations for node $i$ , and $r_{i}$ is the number of possible values of node $i$ , $N_{ij}$ denote the number of cases in the dataset where the parents of node $i$ take the $j$ -th configuration, $N_{ijk}$ is the number of cases where node $i$ takes its $k$ -th value while its parents take the $j$ -th configuration. Edges are retained based on score improvements: lower BIC or higher K2 scores indicate stronger dependencies.

Structure Learning and DAG Construction. We use a Bayesian Belief Network (BBN) to model causal dependencies among domain-specific attributes. A Directed Acyclic Graph (DAG) is constructed using the Hill-Climbing algorithm, a score-based structure learning approach. The algorithm iteratively refines the graph to maximize a scoring criterion, starting from an initial configuration and performing local modifications until convergence.

- – Node-Relationship Analysis. We evaluate candidate graph structures using two well-known scoring functions such as Bayesian Information Criterion (BIC) Score and K2 Score. The functions are formally defined below. $BIC=-2*ln(L)+k*ln(n)$ (1) where L denote the model likelihood, k denote the number of parameters, and n denote the number of data samples. Lower BIC values indicate better models. K2 Score: $K2=\prod_{i=1}^{N}\prod_{j=1}^{q_{i}}\frac{(N_{ij}-1)!}{\prod_{k=1}^{r_{i}}N_{ijk}!}\cdot\frac{(r_{i}-1)!}{(N_{ij}+r_{i}-1)!}$ (2) where, G denote the Bayesian network structure (graph), D denote the dataset, n is the number of nodes (variables), $q_{i}$ denote the number of unique parent configurations for node $i$ , and $r_{i}$ is the number of possible values of node $i$ , $N_{ij}$ denote the number of cases in the dataset where the parents of node $i$ take the $j$ -th configuration, $N_{ijk}$ is the number of cases where node $i$ takes its $k$ -th value while its parents take the $j$ -th configuration. Edges are retained based on score improvements: lower BIC or higher K2 scores indicate stronger dependencies.

Node-Relationship Analysis. We evaluate candidate graph structures using two well-known scoring functions such as Bayesian Information Criterion (BIC) Score and K2 Score. The functions are formally defined below.

> *[Table]*: $BIC=-2*ln(L)+k*ln(n)$ (1)

where L denote the model likelihood, k denote the number of parameters, and n denote the number of data samples. Lower BIC values indicate better models. K2 Score:

> *[Table]*: $K2=\prod_{i=1}^{N}\prod_{j=1}^{q_{i}}\frac{(N_{ij}-1)!}{\prod_{k=1}^{r_{i}}N_{ijk}!}\cdot\frac{(r_{i}-1)!}{(N_{ij}+r_{i}-1)!}$ (2)

where, G denote the Bayesian network structure (graph), D denote the dataset, n is the number of nodes (variables), $q_{i}$ denote the number of unique parent configurations for node $i$ , and $r_{i}$ is the number of possible values of node $i$ , $N_{ij}$ denote the number of cases in the dataset where the parents of node $i$ take the $j$ -th configuration, $N_{ijk}$ is the number of cases where node $i$ takes its $k$ -th value while its parents take the $j$ -th configuration. Edges are retained based on score improvements: lower BIC or higher K2 scores indicate stronger dependencies.

- • Risk Probability Estimation. From the final learned structure, we derive Conditional Probability Tables (CPTs) for each target attribute (e.g., overall risk level) based on its parent nodes in the DAG. These tables enable probabilistic reasoning and simulate cascading effects by computing: $P(C\mid X)=\frac{P(X\mid C)P(C)}{P(X)}$ (3) where, $P(C\mid X)$ denote the posterior probability of class C given the features X, $P(X\mid C)$ denote the likelihood, i.e., the probability of the features X given class C, $P(C)$ is the prior probability of class C, $P(X)$ is the evidence, i.e., the overall probability of features X occurring.

Risk Probability Estimation. From the final learned structure, we derive Conditional Probability Tables (CPTs) for each target attribute (e.g., overall risk level) based on its parent nodes in the DAG. These tables enable probabilistic reasoning and simulate cascading effects by computing:

> *[Table]*: $P(C\mid X)=\frac{P(X\mid C)P(C)}{P(X)}$ (3)

where, $P(C\mid X)$ denote the posterior probability of class C given the features X, $P(X\mid C)$ denote the likelihood, i.e., the probability of the features X given class C, $P(C)$ is the prior probability of class C, $P(X)$ is the evidence, i.e., the overall probability of features X occurring.

### 5 Results and Discussion

This section presents the results of our Bayesian Network–based risk modeling for eight interconnected urban domains. Using the learned DAG structures, we identify both intra and inter-domain dependencies and interpret the Conditional Probability Tables (CPTs) to estimate cascading risks.

#### 5.1 DAG-Based Dependency Structure Analysis

Directed Acyclic Graphs (DAGs) is constructed for each domain using BIC and K2 scoring. For analysis, we selected the DAG from each domain that exhibited the highest number of statistically meaningful dependencies. Figures 2–4 depict domain-specific and cross-domain DAGs. These visualizations reveal significant causal patterns.

- • In natural resource domains with sub-domains such as water, air, electricity, agriculture, strong intra-domain links are observed, e.g., air pollutants such as NO2 and VOCs influence each other and ultimately affect air quality risk.

In natural resource domains with sub-domains such as water, air, electricity, agriculture, strong intra-domain links are observed, e.g., air pollutants such as NO2 and VOCs influence each other and ultimately affect air quality risk.

- • Infrastructure and health domains exhibit fewer but stronger causal edges, reflecting the high impact of fewer critical factors such as ICU capacity or death rate.

Infrastructure and health domains exhibit fewer but stronger causal edges, reflecting the high impact of fewer critical factors such as ICU capacity or death rate.

- • Cross-domain DAGs (Fig. 4) underscore how weather variables like atmospheric pressure and temperature impact water availability and public health indicators, forming pathways of cascading failure.

Cross-domain DAGs (Fig. 4) underscore how weather variables like atmospheric pressure and temperature impact water availability and public health indicators, forming pathways of cascading failure.

> *[Figure]*: (a) Water (b) Air (c) Electricity (d) Agriculture Figure 2: DAGs for Natural resources sub-domians (a) Water (b) Air (c) Electricity (d) Agriculture

(a) Water

(b) Air

(c) Electricity

(d) Agriculture

> *[Figure]*: (a) Climate (b) Weather (c) Infrastructure (d) Health Figure 3: DAGs of Domains (a) Climate, (b) Health, (c) Infrastructure, (d) Weather

(a) Climate

(b) Weather

(c) Infrastructure

(d) Health

> *[Figure]*: (a) Weather and Climate (b) Health and Infrastructure (c) Natural Resources (d) All domains Figure 4: DAGs of domains (a) Weather and Climate, (b) Health Infrastructure, (c) Natural Resources, (d) All Domains

(a) Weather and Climate

(b) Health and Infrastructure

(c) Natural Resources

(d) All domains

#### 5.2 Domain-Level Risk Estimation

For each domain, we compute CPTs to estimate the posterior probability of a domain entering a high-risk state given the values of its parent attributes. Key results are summarized below. Water: The Table 1 represents the CPT for the water sub-domain.

> *[Figure]*: Water Quality Index Water Quality Index(0) Water Quality Index(1) Risk Level(0) $0.0564$ $0.7221$ Risk Level(1) $0.9435$ $0.2778$ Table 1: CPT for Water

> *[Table]*: Water Quality Index Water Quality Index(0) Water Quality Index(1) Risk Level(0) $0.0564$ $0.7221$ Risk Level(1) $0.9435$ $0.2778$

Inference: The Water Quality Index (WQI) alone has a dominant influence. A low WQI increased the probability of a high-risk state from $5.6\%$ to $94.3\%$ , illustrating its criticality in water safety management. Air: The Table 2 represents the CPT for the air sub-domain.

> *[Figure]*: NO2 NO2(0) NO2(1) NO2(1) O3 O3(0) O3(1) O3(1) SO2 SO2(0) SO2(1) SO2(1) VOC VOC(0) VOC(1) VOC(1) Risk Level(0) $0.9980$ $0.2168$ $0.1698$ Risk Level(1) $0.0019$ $0.7831$ $0.8301$ Table 2: CPT for Air

> *[Table]*: NO2 NO2(0) NO2(1) NO2(1) O3 O3(0) O3(1) O3(1) SO2 SO2(0) SO2(1) SO2(1) VOC VOC(0) VOC(1) VOC(1) Risk Level(0) $0.9980$ $0.2168$ $0.1698$ Risk Level(1) $0.0019$ $0.7831$ $0.8301$

Inference: Pollutants including NO2, O3, SO2, and VOCs contributed to high-risk states. When all four pollutants are at elevated levels, the probability of high-risk air conditions exceeds to $83\%$ , highlighting a compounded effect. Electricity: The Table 3 represents the CPT for the electricity sub-domain.

> *[Figure]*: CO2 Emissions CO2 Emissions(0) CO2 Emissions(1) CO2 Emissions(1) Renewable Energy Renewable Energy(0) Renewable Energy(1) Renewable Energy(1) SO2 Emissions SO2 Emissions(0) SO2 Emissions(1) SO2 Emissions(1) Risk Level(0) $0.6877$ $0.8912$ $0.9646$ Risk Level(1) $0.3122$ $0.1087$ $0.035$ Table 3: CPT for Electricity

> *[Table]*: CO2 Emissions CO2 Emissions(0) CO2 Emissions(1) CO2 Emissions(1) Renewable Energy Renewable Energy(0) Renewable Energy(1) Renewable Energy(1) SO2 Emissions SO2 Emissions(0) SO2 Emissions(1) SO2 Emissions(1) Risk Level(0) $0.6877$ $0.8912$ $0.9646$ Risk Level(1) $0.3122$ $0.1087$ $0.035$

Inference: High renewable energy usage and low CO2 emissions significantly reduce electricity-related risks. This supports energy policy emphasis on sustainable grid components. Agriculture: The Table 4 represents the CPT for the agriculture sub-domain.

> *[Figure]*: Soil Quality pH Soil Quality pH(0) Soil Quality pH(1) Risk Level(0) 0.975 0.024 Risk Level(1) 0.894 0.105 Table 4: CPT for Agriculture

> *[Table]*: Soil Quality pH Soil Quality pH(0) Soil Quality pH(1) Risk Level(0) 0.975 0.024 Risk Level(1) 0.894 0.105

Inference: Soil pH shows a binary effect on agricultural risk. A low pH level increases the high-risk probability to $89.4\%$ , emphasizing the need for monitoring agricultural soil health. Health: The Table 5 represents the CPT for the health domain.

> *[Figure]*: Death Rate (per 10k people) Death Rate(0) Death Rate(1) Risk Level(0) $0.9991680532445923$ $0.0008319467554076539$ Risk Level(1) $0.0008319467554076539$ $0.9991680532445923$ Table 5: CPT for Health

> *[Table]*: Death Rate (per 10k people) Death Rate(0) Death Rate(1) Risk Level(0) $0.9991680532445923$ $0.0008319467554076539$ Risk Level(1) $0.0008319467554076539$ $0.9991680532445923$

Inference: The only factor that directly affects the Risk Level in this dataset is the Death Rate per 10,000 people. The table shows the probability that the risk level is very high when the death rate is also high. Conversely, when the death rate is low, the probability of a high-risk level significantly decreases. Infrastructure: The Table 6 represents the CPT for the hospital infrastructure domain.

> *[Figure]*: ICU Capacity ICU Capacity(0) ICU Capacity(1) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923 Table 6: CPT for Infrastructure

> *[Table]*: ICU Capacity ICU Capacity(0) ICU Capacity(1) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923

Inference: The only factor that directly affects the Risk Level in this dataset is ICU Capacity. The table shows that the probability of the risk level being very high is when ICU Capacity is very low. Conversely, when ICU Capacity is high, the probability of a high-risk level significantly decreases, indicating the critical role of healthcare infrastructure in mitigating risk. Weather: The Table 7 represents the CPT for the weather domain.

> *[Figure]*: Atmospheric Pressure Atmospheric Pressure(0) Atmospheric Pressure(1) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923 Table 7: CPT for Weather

> *[Table]*: Atmospheric Pressure Atmospheric Pressure(0) Atmospheric Pressure(1) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923

Inference: The only factor that directly affects the Risk Level in this dataset is Atmospheric Pressure. The table shows that the probability of the risk level being very high increases when atmospheric pressure is at extreme levels. Conversely, when atmospheric pressure remains within a stable range, the probability of a high-risk level significantly decreases. Climate: The Table 8 represents the CPT for the climate domain.

> *[Figure]*: Drought Frequency Drought Frequency(0.0) Drought Frequency(1.0) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923 Table 8: CPT for Climate

> *[Table]*: Drought Frequency Drought Frequency(0.0) Drought Frequency(1.0) Risk Level(0) 0.9991680532445923 0.0008319467554076539 Risk Level(1) 0.0008319467554076539 0.9991680532445923

Inference: The only factor that directly affects the Risk Level in this dataset is Drought Frequency. The table shows the probability that the risk level is very high when the drought frequency is also high. Conversely, when the drought frequency is low, the probability of a high-risk level significantly decreases.

#### 5.3 Cross-Domain Cascading Risk Patterns

The DAGs and CPTs are further analyzed to reveal multi-hop cascading effects across domains. Notable observations are outlined below.

- • In the Water sub-domain, dissolved oxygen and nitrate levels show a strong conditional influence on overall water risk. The CPTs indicate that low dissolved oxygen significantly increases the probability of a high-risk state in water quality. – Water → Infrastructure → Health: High Water Usage → Reduced Turbidity Management → Health Risk Level Increase

In the Water sub-domain, dissolved oxygen and nitrate levels show a strong conditional influence on overall water risk. The CPTs indicate that low dissolved oxygen significantly increases the probability of a high-risk state in water quality.

- – Water → Infrastructure → Health: High Water Usage → Reduced Turbidity Management → Health Risk Level Increase

Water → Infrastructure → Health: High Water Usage → Reduced Turbidity Management → Health Risk Level Increase

- • For the Air domain, pollutants like NO2, VOCs and SO2 emerged as key drivers. The CPTs show that even marginal increases in these pollutants lead to a higher likelihood of air quality deterioration, confirming their role in urban air toxicity. – Air → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk In the Electricity domain, renewable energy percentage and CO2 emissions were highly influential. CPTs highlight that low renewable energy penetration, combined with high CO2 levels, leads to elevated electricity risk levels and unstable grid conditions.

For the Air domain, pollutants like NO2, VOCs and SO2 emerged as key drivers. The CPTs show that even marginal increases in these pollutants lead to a higher likelihood of air quality deterioration, confirming their role in urban air toxicity.

- – Air → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk In the Electricity domain, renewable energy percentage and CO2 emissions were highly influential. CPTs highlight that low renewable energy penetration, combined with high CO2 levels, leads to elevated electricity risk levels and unstable grid conditions.

Air → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk In the Electricity domain, renewable energy percentage and CO2 emissions were highly influential. CPTs highlight that low renewable energy penetration, combined with high CO2 levels, leads to elevated electricity risk levels and unstable grid conditions.

- • In the health and infrastructure domain, the CPTs expose multi-variable dependencies, where factors like ICU capacity, staff density, and emergency service response times play significant roles in determining the health risk level. Conditional dependencies show that if even one of these factors is in a low state, the risk probability sharply increases. – Agriculture → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk

In the health and infrastructure domain, the CPTs expose multi-variable dependencies, where factors like ICU capacity, staff density, and emergency service response times play significant roles in determining the health risk level. Conditional dependencies show that if even one of these factors is in a low state, the risk probability sharply increases.

- – Agriculture → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk

Agriculture → Water → Health: High VOCs → Low Water Quality Index → High BOD → Public Health Risk

In the Weather and Climate domain, the Conditional Probability Tables (CPTs) highlight temperature, humidity, rainfall, atmospheric pressure, and sea level rise as key influencing factors. Weather-related risk is predominantly driven by anomalies in humidity and temperature, with even minor deviations significantly increasing the likelihood of a high-risk state. Climate risk, on the other hand, is shaped by long-term environmental indicators such as solar radiation, atmospheric pressure fluctuations, and rising sea levels. The CPTs underscore that while each of these factors may individually exert a moderate influence, their combined and cumulative variations can collectively escalate the overall risk, illustrating the compounding nature of environmental stress in cascading failure scenarios. In the Cross-Domain analysis, the Conditional Probability Tables (CPTs) reveal clear patterns of risk propagation across interconnected urban systems. For instance, weather-related stressors are found to significantly impact water availability, while deteriorating air quality increased the likelihood of adverse health outcomes. Similarly, vulnerabilities in infrastructure, such as limited ICU capacity or delayed emergency responses, exacerbates risks in the health sector. A key insight from the CPTs is that cascading failures are more likely to emerge when multiple domains experience moderate stress simultaneously, rather than from a singular extreme event in one domain. This highlights the importance of a holistic, system-wide perspective in risk management, where the combined effect of multiple stressors is considered more critical than isolated domain failures. These insights can guide practical implementations in energy grid management, public health preparedness, and infrastructure planning by simulating possible chains of failure.

#### 5.4 Discussion

This study demonstrates how integrating real-world urban indicators with synthetically generated data using Conditional GANs, enhanced through SMOTE-based balancing, allows for robust modeling of cascading risks in urban cities. By employing Bayesian Belief Networks trained via score-based DAG learning (BIC and K2), the proposed framework successfully captures both intra and inter-domain dependencies. The learned structures and corresponding CPTs not only quantify the likelihood of risk escalation but also offer interpretable insights into complex, multi-variable interactions.

A key insight from the results is that cascading failures are more likely to arise from moderate stress across multiple domains rather than from isolated extreme events. This supports a systems-oriented approach to urban resilience, where the compounded influence of domain interconnectivity is accounted for in both analysis and planning. The framework thus provides a transparent and scalable decision-support tool that can guide proactive interventions across infrastructure, public health, energy, and environmental systems.

### 6 Conclusion

This work presents a foundational data-driven probabilistic framework for cascading risk analysis in smart city domains using Bayesian Belief Networks and Directed Acyclic Graphs. By combining real and synthetically generated urban datasets and addressing data imbalance through SMOTE, the framework captures key interdependencies across domains such as air, water, agriculture, electricity, health, and infrastructure. Structure learning via score-optimized DAG construction and probabilistic inference using CPTs enables interpretable estimation of risk propagation across interconnected domains.

In future work, this framework can be extended to incorporate temporal dimensions for real-time forecasting, integrate multi-modal sensor streams for high-resolution monitoring, and embed adaptive decision-making for automated policy response. Techniques such as Kullback–Leibler (KL) divergence can further be employed to assess model fidelity by comparing learned structures with ground-truth baselines. Overall, this framework establishes a scalable, interpretable foundation for cascading risk modeling and supports the development of resilient, data-informed urban management strategies.

### References

- [2] [ [1] ] A. Morozova and S. S. Yatsechko, The Risks of Smart Cities and the Perspectives of Their Management Based on Corporate Social Responsibility in the Interests of Sustainable Development , MDPI, Basel, 2022.
- [4] [ [2] ] L. G. Brunner, R. A. M. Peer, C. Zorn, R. Paulik, and T. M. Logan, Understanding Cascading Risks Through Real-World Interdependent Urban Infrastructure , MDPI, 2023.
- [6] [ [3] ] N. U. I. Hossain, S. El Amrani, R. Jaradat, M. Marufuzzaman, R. Buchanan, C. Rinaudo, and M. Hamilton, Bayesian Networks for Modeling Interdependencies in Critical Infrastructure Systems , Journal of Urban Systems and Networks, 9(3), pp. 205-220, 2021.
- [8] [ [4] ] F. Ullah, S. Qayyum, M. J. Thaheem, F. Al-Turjman, and S. M. E. Sepasgozar, Risk Management in Sustainable Smart Cities Governance: A TOE Framework , Technological Forecasting and Social Change, vol. 167(1), 2021.
- [10] [ [5] ] L. B. Elvas, B. M. Mataloto, and A. L. Martins, Disaster Management in Smart Cities , MDPI, 2021.
- [12] [ [6] ] T. Nguyen, L. Hallo, N. H. Nguyen, and B. V. Pham, A Systemic Approach to Risk Management for Smart City Governance , WCSE International Conference on Industrial Engineering and Applications, 9(1), pp. 1321-1328, 2022.
- [14] [ [7] ] M. Mourshed, A. Bucchiarone, and F. Khandokar, SMART: A Process-Oriented Methodology for Resilient Smart Cities , IEEE International Conference on Systems, Man, and Cybernetics, pp. 1-13, Sept. 2016.
- [16] [ [8] ] M. A. Fadhel, M. Ali, M. Duhaim, A. Saihood, A. Sewify, N. A. Mokhaled, Al-Hamadani, A. S. Albahri, L. Alzubaidi, A. Gupta, S. Mirjalili, Y. Gu , Comprehensive Systematic Review of Information Fusion Methods in Smart Cities and Urban Environments , Information Fusion, vol. 107, pp. 1-31, 2024.
- [18] [ [9] ] Y. Himeur, M. Elnour, F. Fadli, N. Meskin, I. Petri, Y. Rezgui, F. Bensaali, A. Amira, Next-Generation Energy Systems for Sustainable Smart Cities: Roles of Transfer Learning , Sustainable Cities and Society, vol. 73, pp. 328-338, 2022.
- [20] [ [10] ] K. Kowsari, M. Kiara Jafari, H. Mojtaba, S. Mendu, L. Barnes, D. Brown, Text Classification Algorithms: A Survey , Information, 10(4), pp. 1-12, Apr. 2019.
- [22] [ [11] ] D. O’Hare, M. Wiggins, A. Williams, W. Wong, Cognitive Task Analyses for Decision-Centered Design and Training , Ergonomics, 41(11), pp. 1698-1718, Nov. 1998.
- [24] [ [12] ] C. Sohrabi, T. Franchi, G. Mathew, A. Kerwan, M. Nicola, M. Griffin, M. Agha, R. Agha, PRISMA 2020 Statement: What’s New and the Importance of Reporting Guidelines , International Journal of Surgery, vol. 88, pp. 1-9, 2021.
- [26] [ [13] ] G. D’Aniello, R. Gravina, M. Gaeta, G. Fortino, Situation-Aware Sensor-Based Wearable Computing Systems: A Reference Architecture-Driven Review , IEEE Sensors Journal, 22(14), pp. 13853-13863, 2022.
- [28] [ [14] ] S. Peter, and A. Mathew, Cross-Layer Design with Weighted Sum Approach for Extending Device Sustainability in Smart Cities , Sustainable Cities and Society, vol. 77, 2022.
- [30] [ [15] ] Y. Zhang, X. Lu, H. Yin, and R. Zhao, Pandemic, Risk-Adaptation and Household Saving: Evidence from China , China Finance Review International, 2021.
- [32] [ [16] ] W. Song, H. Gong, Q. Wang, L. Zhang, L. Qiu, X. Hu, H. Han, Y. Li, R. Li, and Y. Li, Using Bayesian Networks with Max-Min Hill-Climbing Algorithm to Detect Factors Related to Multimorbidity , Frontiers in Cardiovascular Medicine, vol. 9, 2022.
- [34] [ [17] ] R. P. Adhitama, D. R. S. Saputro, and Sutanto, Hill Climbing Algorithm on Bayesian Network to Determine Probability Value of Symptoms and Eye Diseases , BAREKENG: Journal of Mathematics and Its Application, 16(4), pp. 1271–1282, 2022.
- [36] [ [18] ] S. Dong, T. Yu, H. Farahmand, A. Mostafavi, Bayesian Modeling of Flood Control Networks for Failure Cascade Characterization and Vulnerability Assessment , Comput Aided Civ Inf, 2019.
- [38] [ [19] ] M. Wright, H. Chizari, and T. Viana, A Systematic Review of Smart City Infrastructure Threat Modeling Methodologies: A Bayesian Focused Review , Sustainability, 2022.
- [40] [ [20] ] S. Dong, T. Yu, H. Farahmand, A. Mostafavi, Probabilistic Modeling of Cascading Failure Risk in Interdependent Channel and Road Networks in Urban Flooding , 2020.