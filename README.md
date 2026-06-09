_This README is a static copy of our [Wiki home page](https://github.com/StanfordCS194/spr26-Team-14/wiki). It may be out of sync. :)_

***

<img src="assets/logo.svg" height="100"/>

🎵 **Theme Music:** [Inception Soundtrack — Hans Zimmer, "Time"](https://www.youtube.com/watch?v=RxabLA7UQ9k)

## First time?
We're so excited to have you check out our repo! Check out [Developer Environment Setup](https://github.com/StanfordCS194/spr26-Team-14/wiki/Developer-Environment-Setup) for first steps.

### Local quick start

```bash
bun install
cp server/.env.example server/.env
bun run dev
```

Open http://localhost:5173. Without provider keys, tests and local demo runs use deterministic provider doubles. For live monitoring, configure one or more of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY`.

Verification:

```bash
bun test
bun run build:web
```

## Project Synopsis
As people increasingly move to AI chatbots, companies need ways to track and improve how their products and services are mentioned and discussed by these tools. We're building **Perception**, a platform that gives companies visibility into AI-generated brand mentions and actionable insights to improve how they appear in AI responses.

## Our Team
| <img src="assets/arun.jpeg" height="100" alt="Arun Moorthy"/> | <img src="assets/welton.png" height="100" alt="Welton Wang"/> | <img src="assets/charlotte.jpeg" height="100" alt="Charlotte Yan"/> | <img src="assets/krish.png" height="100" alt="Krish Maniar"/> | <img src="assets/connor.png" height="100" alt="Connor Fogarty"/> |
|:--:|:--:|:--:|:--:|:--:|
| Arun Moorthy | Welton Wang | Charlotte Yan | Krish Maniar | Connor Fogarty |
| amoorth2@stanford.edu | welton@stanford.edu | ckyy@stanford.edu | kmaniar@stanford.edu | cfogarty@stanford.edu |

## Team Member Matrix
Member | Areas of Expertise | Personal Traits | Gaps/Weaknesses
--- | --- | --- | --- 
Arun Moorthy | Software development, customer feedback, scaling applications | Nice, kind, confident | Sometimes can be too agreeable 
Welton Wang | Python, design, infrastructure, products | Problem solver | Math, writing 
Charlotte Yan | Designing benchmarks, computer use agents, ethics | Detail oriented | Physics
Krish Maniar | Backend, databases | Nice, chill | Too much of a perfectionist
Connor Fogarty | Database design, production code | Easygoing | Sometimes can be too easygoing

## Product Requirements Document (PRD)
https://docs.google.com/document/d/1_7ihu_LTOc90rLPz_Z4Qi2hujh1mniR2B4RlztDDm_A/edit?tab=t.0#heading=h.mzf2knh2cjc1

## Engineering documentation

- [Architecture and data flow](docs/architecture.md)
- [Demo and end-to-end flow](DEMO.md)
- [Provider configuration](server/.env.example)

The GitHub Wiki remains the documentation index required by the course. Link these repository documents from the Wiki sidebar when publishing documentation updates.

## User Testing Plan
https://docs.google.com/document/d/1nJyBwkMN8ch1CiVC2bMPHw1x2-OVG9CUHAtRjKS6ua4/edit?tab=t.0

## Weekly Schedule
<img src="assets/weekly_schedule.png" height="100"/>

## Source control with git (write name here)
Charlotte
Arun
Welton
Krish
Connor
