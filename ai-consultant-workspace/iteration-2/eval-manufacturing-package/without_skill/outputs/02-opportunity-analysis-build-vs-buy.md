# TitanWorks Opportunity Analysis: Build vs. Buy for Predictive Maintenance

**Client**: TitanWorks Manufacturing
**Date**: March 19, 2026
**Document Type**: Opportunity Analysis with Build/Buy/Hybrid Evaluation

---

## 1. Opportunity Quantification

### 1.1 Current Cost of Unplanned Downtime

| Metric | Value | Basis |
|--------|-------|-------|
| Monthly unplanned downtime cost | $2,000,000 | Client-reported |
| Annual unplanned downtime cost | $24,000,000 | Annualized |
| Downtime as % of revenue | 8.0% | $24M / $300M |
| Industry benchmark (discrete mfg.) | 2-5% | Aberdeen, Deloitte |
| Excess downtime cost vs. benchmark | $9M - $18M/year | Gap to benchmark |
| Per-factory average downtime cost | $500,000/month | $2M / 4 factories |

### 1.2 Downtime Decomposition (Estimated)

Based on industry patterns for mid-size discrete manufacturers:

| Downtime Category | % of Total | Annual Cost | Addressable by PdM |
|-------------------|-----------|-------------|---------------------|
| Mechanical failure (bearings, motors, pumps) | 35% | $8,400,000 | 70-85% |
| Electrical failure (drives, controls, wiring) | 20% | $4,800,000 | 50-65% |
| Process upsets (quality, calibration drift) | 15% | $3,600,000 | 40-55% |
| Operator error | 12% | $2,880,000 | 15-25% |
| Supply chain (materials, spare parts) | 10% | $2,400,000 | 20-30% |
| External (utilities, weather, regulatory) | 8% | $1,920,000 | 5-10% |

**Total Addressable Downtime**: Approximately 50-65% of unplanned downtime ($12M-$15.6M/year) can be addressed through predictive maintenance and condition monitoring.

### 1.3 Additional Value Streams

Beyond downtime reduction, predictive maintenance creates secondary value:

| Value Stream | Estimated Annual Value | Confidence |
|-------------|----------------------|------------|
| Reduced spare parts inventory (15-25% reduction) | $600K - $1,200K | Medium |
| Extended equipment life (10-20% longer MTBF) | $800K - $1,500K | Medium |
| Reduced overtime for emergency repairs | $400K - $700K | High |
| Insurance premium reduction (demonstrated risk mgmt.) | $100K - $300K | Low |
| Energy optimization from equipment health monitoring | $200K - $500K | Medium |
| **Total Secondary Benefits** | **$2.1M - $4.2M/year** | |

### 1.4 Total Opportunity

| Scenario | Downtime Reduction | Annual Savings | With Secondary Benefits |
|----------|-------------------|----------------|------------------------|
| Conservative | 25% of addressable ($12M) | $3,000,000 | $3,500,000 - $4,100,000 |
| Expected | 40% of addressable ($13.5M) | $5,400,000 | $6,700,000 - $8,000,000 |
| Optimistic | 55% of addressable ($15.6M) | $8,580,000 | $10,700,000 - $12,800,000 |

---

## 2. Build vs. Buy Analysis

### 2.1 Option A: Full Build (Custom Platform)

**Description**: Build a custom predictive maintenance platform on Azure using open-source ML frameworks, custom data pipelines, and internally developed models.

#### Cost Estimate (3-Year TCO)

| Cost Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
|--------------|--------|--------|--------|--------------|
| Data engineering team (3 FTEs) | $540,000 | $560,000 | $580,000 | $1,680,000 |
| Data science team (2 FTEs) | $400,000 | $420,000 | $440,000 | $1,260,000 |
| ML ops / platform engineer (1 FTE) | $180,000 | $190,000 | $200,000 | $570,000 |
| IoT/OT integration specialist (1 FTE) | $170,000 | $175,000 | $180,000 | $525,000 |
| Project management (1 FTE) | $150,000 | $155,000 | $160,000 | $465,000 |
| Azure infrastructure (IoT Hub, ML, storage) | $180,000 | $240,000 | $300,000 | $720,000 |
| Sensor hardware & installation (60% gap) | $1,200,000 | $400,000 | $200,000 | $1,800,000 |
| Edge computing infrastructure | $300,000 | $100,000 | $50,000 | $450,000 |
| External consulting (architecture, OT security) | $400,000 | $200,000 | $100,000 | $700,000 |
| Training & change management | $150,000 | $100,000 | $75,000 | $325,000 |
| **Total** | **$3,670,000** | **$2,540,000** | **$2,285,000** | **$8,495,000** |

#### Pros
- Full customization to TitanWorks-specific equipment and failure modes
- Complete IP ownership and no vendor lock-in
- Long-term cost advantage if scaled beyond 4 factories
- Deep internal capability development

#### Cons
- **Hiring 8 specialized FTEs in a competitive market takes 6-12 months**
- **Time to first value: 12-18 months (vs. 3-6 months for buy)**
- Highest execution risk given zero current data science capability
- Requires managing complex ML model lifecycle internally
- **Previous failed initiative makes another large, slow-to-deliver project politically dangerous**

#### Verdict: **NOT RECOMMENDED** for TitanWorks given current maturity, capability gaps, and organizational context.

---

### 2.2 Option B: Full Buy (Commercial Platform)

**Description**: Deploy an established industrial predictive maintenance platform (e.g., Azure IoT / Sight Machine / Uptake / Augury / SparkCognition / PTC ThingWorx).

#### Cost Estimate (3-Year TCO)

| Cost Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
|--------------|--------|--------|--------|--------------|
| Platform license (per-asset model, ~200 assets) | $600,000 | $620,000 | $640,000 | $1,860,000 |
| Implementation partner (deployment, integration) | $800,000 | $300,000 | $150,000 | $1,250,000 |
| Sensor hardware & installation (60% gap) | $1,200,000 | $400,000 | $200,000 | $1,800,000 |
| Edge computing infrastructure | $250,000 | $80,000 | $50,000 | $380,000 |
| Azure infrastructure (reduced — platform managed) | $80,000 | $100,000 | $120,000 | $300,000 |
| Internal IT support (1.5 FTE reallocation) | $225,000 | $235,000 | $245,000 | $705,000 |
| Internal PdM analyst (1 FTE, domain + analytics) | $0 | $130,000 | $135,000 | $265,000 |
| Training & change management | $200,000 | $100,000 | $50,000 | $350,000 |
| **Total** | **$3,355,000** | **$1,965,000** | **$1,590,000** | **$6,910,000** |

#### Pros
- **Fastest time to value: 3-6 months for initial deployment**
- Pre-built models for common industrial equipment (motors, pumps, compressors, conveyors)
- Vendor handles model development, training, and tuning
- Lower execution risk — proven at similar manufacturers
- Minimal hiring required (1-2 roles vs. 8)

#### Cons
- Ongoing license costs that scale with asset count ($3K-$5K per monitored asset/year)
- Vendor lock-in risk — switching costs are high once embedded in operations
- Limited customization for TitanWorks-specific equipment or processes
- Less internal capability development — dependency on vendor
- Some platforms struggle with non-standard or legacy equipment

#### Verdict: **VIABLE** but creates vendor dependency and limits long-term strategic capability.

---

### 2.3 Option C: Hybrid (Recommended)

**Description**: Use a commercial platform for rapid initial deployment and proven use cases, while building internal capability to customize, extend, and eventually in-source critical components. Leverage Azure-native services where possible to maintain platform alignment.

#### Cost Estimate (3-Year TCO)

| Cost Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
|--------------|--------|--------|--------|--------------|
| Platform license (pilot: 50 assets, expand to 150) | $200,000 | $400,000 | $500,000 | $1,100,000 |
| Implementation partner (phased deployment) | $500,000 | $250,000 | $100,000 | $850,000 |
| Sensor hardware & installation (phased) | $600,000 | $600,000 | $300,000 | $1,500,000 |
| Edge computing infrastructure (phased) | $150,000 | $100,000 | $50,000 | $300,000 |
| Azure infrastructure | $100,000 | $150,000 | $200,000 | $450,000 |
| Internal hires: Data engineer (1) + PdM analyst (1) | $150,000 | $310,000 | $320,000 | $780,000 |
| Internal hire: Data scientist (1, Year 2) | $0 | $190,000 | $200,000 | $390,000 |
| Training & change management | $150,000 | $120,000 | $80,000 | $350,000 |
| **Total** | **$1,850,000** | **$2,120,000** | **$1,750,000** | **$5,720,000** |

#### Pros
- **Balanced time to value: 3-4 months for pilot, 6-9 months for first factory**
- Lower Year 1 investment than either pure option — critical for CFO confidence
- Builds internal capability progressively (3 hires over 18 months vs. 8 immediately)
- Retains option to shift more build vs. buy over time based on results
- Azure alignment maintained — portability preserved
- **Pilot-first approach directly addresses organizational trust deficit**

#### Cons
- Moderate complexity in managing vendor + internal capability simultaneously
- Requires clear governance on build vs. buy boundaries
- Platform selection still critical — wrong choice creates rework

#### Verdict: **STRONGLY RECOMMENDED** for TitanWorks given maturity level, capability gaps, and organizational dynamics.

---

## 3. Comparative Summary

| Criteria | Build | Buy | Hybrid (Rec.) |
|----------|-------|-----|---------------|
| 3-Year TCO | $8,495,000 | $6,910,000 | $5,720,000 |
| Time to first value | 12-18 months | 3-6 months | 3-4 months |
| Hiring requirement | 8 FTEs | 1-2 FTEs | 3 FTEs (phased) |
| Execution risk | Very High | Low-Medium | Low |
| Vendor dependency | None | High | Medium (decreasing) |
| Internal capability built | High | Low | Medium (growing) |
| Customization potential | Unlimited | Limited | Growing over time |
| CFO confidence | Low | Medium | High |
| Political risk (post-failure) | Very High | Medium | Low |
| 5-year strategic position | Best (if successful) | Weakest | Strong |

---

## 4. Platform Shortlist (for Hybrid Approach)

Based on Azure alignment, mid-market manufacturing fit, and predictive maintenance maturity:

| Platform | Azure Native | Mfg. Focus | Pre-built Models | Pricing Model | Fit Score |
|----------|-------------|------------|------------------|---------------|-----------|
| **Azure IoT + Sight Machine** | Native | Strong | Good | Per-asset | 8.5/10 |
| **PTC ThingWorx + Azure** | Integrated | Strong | Good | Platform + per-asset | 7.5/10 |
| **Uptake (asset.ai)** | Compatible | Strong | Excellent | Per-asset | 8.0/10 |
| **Augury** | Compatible | Strong | Good (vibration focus) | Per-sensor | 7.0/10 |
| **SparkCognition** | Compatible | Moderate | Good | Platform license | 6.5/10 |

**Recommendation**: Conduct a 4-week competitive evaluation of top 2 platforms (Sight Machine + Uptake) with structured scoring against TitanWorks-specific requirements before final selection.

---

## 5. Sensor Gap Analysis

### Current Coverage Assessment

| Equipment Category | Estimated Count | Currently Monitored | Gap | Priority |
|-------------------|----------------|--------------------|----|----------|
| Motors & drives (>50 HP) | 120 | 48 (40%) | 72 | Critical |
| Pumps & compressors | 80 | 32 (40%) | 48 | Critical |
| Conveyors & material handling | 60 | 24 (40%) | 36 | High |
| HVAC & environmental | 40 | 16 (40%) | 24 | Medium |
| CNC / machining centers | 50 | 20 (40%) | 30 | High |
| Hydraulic / pneumatic systems | 30 | 12 (40%) | 18 | Medium |
| Electrical distribution | 20 | 8 (40%) | 12 | High |
| **Total** | **400** | **160** | **240** | |

### Sensor Investment Priority Matrix

| Priority Tier | Equipment | Sensor Types | Cost/Unit | Total Units | Investment |
|--------------|-----------|-------------|-----------|-------------|------------|
| Tier 1 (Month 1-6) | High-value motors, critical pumps | Vibration, temp, current | $3,000 | 50 | $150,000 |
| Tier 2 (Month 4-10) | Remaining motors, compressors | Vibration, temp, pressure | $2,500 | 80 | $200,000 |
| Tier 3 (Month 8-16) | Conveyors, CNC, hydraulics | Multi-parameter | $4,000 | 60 | $240,000 |
| Tier 4 (Month 14-24) | Remaining equipment | Mixed | $3,500 | 50 | $175,000 |

*Note: Costs include sensor hardware, gateway/edge connectivity, installation labor, and commissioning. Actual costs will vary by factory layout and existing infrastructure.*

---

## 6. Risk-Adjusted Recommendation

Given TitanWorks' profile:
- **Maturity**: Stage 2 (low) -- needs guided, low-risk path
- **Capability**: Zero data science -- cannot execute build strategy
- **Organizational context**: Failed initiative -- must demonstrate value fast
- **Financial scrutiny**: CFO requires ROI proof -- phased investment with clear gates
- **Platform**: Azure -- leverage existing investment

**The hybrid approach is the only viable strategy.** It delivers early wins to rebuild trust, manages investment risk through phased commitment, builds internal capability progressively, and positions TitanWorks for long-term strategic advantage without creating excessive vendor dependency.

---

*Next document: Three-tier proposal with detailed investment, timeline, and deliverables for each tier.*
