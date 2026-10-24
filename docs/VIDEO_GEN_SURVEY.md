# GitHub `video-generation` topic: what is usable for us

Method: the topic has 4,584 repos; the **top 500 by stars** (down to 82 stars) were pulled on 2026-10-24, classified by keywords in name /
description / topics, and filtered by licence (MIT, Apache-2.0, BSD, ISC, MPL, CC0 count as permissive) and activity (pushed in 2026, not
archived). The most promising READMEs were then read for hardware needs. Our constraints: free to run (GitHub 2-core CPU runners, free Kaggle
GPU 16 GB), Hindi voice, our own characters, no per-second API bills.

| category | repos | permissive | permissive + active |
|---|---|---|---|
| video diffusion models / inference | 144 | 102 | 69 |
| auto short-video / pipelines / agents | 134 | 91 | 74 |
| character animation / motion / 3D | 121 | 77 | 49 |
| talking-head / lip-sync / avatar | 41 | 22 | 14 |
| code-based video (Remotion, HTML) | 6 | 6 | 6 |
| other / research | 50 | 29 | 20 |

## Verdict by lane

**1. Runs on our free CPU runners (use now)**
- Code-rendered video (what we already do): `Vincentwei1021/video-shotcraft` (Apache-2.0, 150 Remotion shot recipes: camera moves, transitions:
  borrow for the 3D camera director), `nexu-io/html-video` and `OneMoh/html-explainer` (HTML to MP4, alternative renderer),
  `Agents365-ai/video-podcast-maker` (Remotion + local TTS, same idea as ours), `Alisa0808/vox-director` (paper-collage explainer style),
  `showlab/Code2Video` (Manim, for diagrams). `latent-spaces/brag` (MIT) is a Remotion launch-video generator, not relevant to stories.

**2. Needs a GPU, fits a free Kaggle 16 GB (optional "AI hero shot" lane, benchmark first)**
- `hao-ai-lab/FastVideo` (Apache-2.0): distilled FastWan 1.3B (5 s video in 1.8 s on a fast GPU), documented for Colab/Kaggle-style machines.
- `FlashML-org/FreeVideo` (Apache-2.0): MiniMax H3 at 8 GB VRAM / 16 GB RAM, ComfyUI plugin, 8-step model.
- `ModelTC/LightX2V` (Apache-2.0): Wan2.1/2.2 + HunyuanVideo-1.5 4-step distilled (~25x faster), offload and quantisation.
- `Wan-Video/Wan2.2` (Apache-2.0): TI2V-5B image-to-video, low-VRAM via DiffSynth-Studio offload + FP8.
- `antgroup/echomimic_v3` (Apache-2.0): audio-driven half-body human animation in 12 GB; for real-person presenters, not cartoons.
- `zai-org/SCAIL` (Apache-2.0): studio-grade character animation from 3D pose; low-VRAM through WanGP.
- Caveats for all: seconds-long clips, identity drift between clips, no word-exact lip sync with our cloned voice, slow on a free GPU.

**3. API-based or paid (avoid under the "free" rule)**
- `HKUDS/ViMax`, `ATH-MaaS/Pixelle-Video`, `HBAI-Ltd/Toonflow-app`, `xuanyustudio/LocalMiniDrama`, `Stonewuu/ai-fusion-video`, `waooAI/waoowaoo`,
  `krillinai/OpenCreator`: agent/canvas/pipeline products that call Seedance / Kling / OpenRouter image and video models (billed per second).
  Useful as design references (director / screenwriter / producer split, storyboard canvas), not as the renderer.

**4. Licence watch-outs**
- OpenMontage is AGPL-3.0: do not copy its code into our repos; ideas only.
- Hypit: Apache-2.0 with conditions (own use fine, no hosting for third parties).
- LivePortrait, Duix-Avatar: licence field is "NOASSERTION"; face-model weights can be non-commercial. Verify before any use on monetised channels.

## Top permissive + active repos by category (from the 500)


### auto short-video / pipeline / agents
- 29343★ `ATH-MaaS/Pixelle-Video` (Apache-2.0, pushed 2026-06-14): 🚀 AI 全自动短视频引擎 | AI Fully Automated Short Video Engine
- 12742★ `HKUDS/ViMax` (MIT, pushed 2026-09-30): "ViMax: Agentic Video Generation (Director, Screenwriter, Producer, and Video Generator All-in-One)"
- 4567★ `darkzOGx/youtube-automation-agent` (MIT, pushed 2026-10-20): 🎬 Open-source, self-hosted AI agent that runs a YouTube channel end to end: researches topics, writes scripts,
- 3796★ `SandAI-org/MAGI-1` (Apache-2.0, pushed 2026-06-17): MAGI-1: Autoregressive Video Generation at Scale
- 3358★ `microsoft/ResearchStudio` (MIT, pushed 2026-09-21): ResearchStudio: Our AI co-author, from research problem to final publication.
- 2951★ `ModelTC/LightX2V` (Apache-2.0, pushed 2026-10-23): Lightweight Image Video Action Generation Inference Framework
- 2810★ `cclank/lanshu-create-ai-presenter-video` (MIT, pushed 2026-10-11): Provider-neutral Codex Skill for producing verified AI presenter videos from a script and an authorized presen
- 2193★ `xuanyustudio/LocalMiniDrama` (MIT, pushed 2026-10-21): 🎬 seedance2接入  开源本地 AI 短剧 & 漫剧生成工具 —— 从故事到成片一站式完成，数据不出本机，短剧工作流管理平台，高灵活度，AI真人剧，AI漫剧本地搞定。 Open-source local AI s
- 2163★ `showlab/Code2Video` (MIT, pushed 2026-08-24): [ICML 2026] Video generation via code
- 1876★ `HITsz-TMG/VideoClaw` (MIT, pushed 2026-08-26): 🚀 AI 全自动化视频生成员工 | Your First AIGC Coworker. Chat an Idea. Get a Film. 🦞
- 1628★ `869413421/ai-moive-studio` (Apache-2.0, pushed 2026-09-16): 自然语言驱动的无限画布工作流 Agent，让 AI 视频创作第一次真正变成可编辑的工作流。   AICON 面向创作者，提供从剧本拆解、分镜生成、素材生成、视频合成到内容分发的一整套能力。   不是只给你一个输入框，而是
- 1483★ `pyang5166/gbro-collage-broll` (MIT, pushed 2026-07-15): 半调纸拼贴 B-roll 生成 skill：三闸门审批，Gemini Omni Flash 首尾帧组装动画 | Editorial halftone paper-collage B-roll agent skill

### video diffusion models / inference
- 18142★ `Wan-Video/Wan2.2` (Apache-2.0, pushed 2026-09-21): Wan: Open and Advanced Large-Scale Video Generative Models
- 9634★ `NVlabs/Sana` (Apache-2.0, pushed 2026-10-23): SANA: Efficient High-Resolution Image Synthesis with Linear Diffusion Transformer
- 7331★ `vllm-project/vllm-omni` (Apache-2.0, pushed 2026-10-24): A framework for efficient model inference with omni-modality models
- 4700★ `hao-ai-lab/FastVideo` (Apache-2.0, pushed 2026-10-24): A unified inference and post-training framework for accelerated video generation.
- 4541★ `Robbyant/lingbot-world` (Apache-2.0, pushed 2026-07-09): Advancing Open-source World Models
- 3851★ `thu-ml/TurboDiffusion` (Apache-2.0, pushed 2026-08-27): TurboDiffusion: 100–200× Acceleration for Video Diffusion Models
- 2831★ `NVlabs/LongLive` (Apache-2.0, pushed 2026-10-23): Long Video Gen / World Model / World Action Model (Embodied) Infrastructure
- 2289★ `FlashML-org/FreeVideo` (Apache-2.0, pushed 2026-10-23): Make videos on the computer you already own. FreeVideo runs MiniMax H3 in as little as 8 GB of VRAM and 16 GB 
- 2223★ `PKU-YuanGroup/Helios` (Apache-2.0, pushed 2026-08-24): Helios: Real Real-Time Long Video Generation Model
- 1831★ `Vchitect/VBench` (Apache-2.0, pushed 2026-08-21): [CVPR2024 Highlight] VBench - We Evaluate Video Generation
- 1591★ `MiniMax-AI/MiniMax-MCP` (MIT, pushed 2026-08-20): Official MiniMax Model Context Protocol (MCP) server that enables interaction with powerful Text to Speech, im
- 1361★ `bytedance/Lance` (Apache-2.0, pushed 2026-07-14): A 3B-active-parameter native unified multimodal model for image and video understanding, generation, and editi

### character animation / motion / 3D
- 19160★ `HBAI-Ltd/Toonflow-app` (MIT, pushed 2026-10-20): 短剧、漫剧制作工具 Toonflow：开源 AI 视频创作平台，集成剧本创作、智能分镜、角色与场景资产管理、图像生成和视频生成。融合无限画布、AI Agent 与可视化工作流，支持本地部署、自选模型、跨平台客户端、MCP
- 13298★ `Vincentwei1021/video-shotcraft` (Apache-2.0, pushed 2026-10-17): AI video skill for Claude Code & Codex — cinematic product videos with Remotion: 152 shot recipe cards, 209 mo
- 2435★ `Alisa0808/vox-director` (MIT, pushed 2026-10-05): Turn one topic into a finished Vox-style paper-collage explainer/ad video — automated end to end on Atlas Clou
- 2249★ `LearnPrompt/awesome-seedance` (MIT, pushed 2026-10-24): 🎬 Evidence-led Seedance 2.5 / 2.0 prompt library: 840+ cases traced to original posts, 490+ cross-model retest
- 1693★ `Agents365-ai/video-podcast-maker` (MIT, pushed 2026-10-01): Topic → 4K narrated video for coding agents. v5.3.0: local TTS (edge free + azure, no external engine), manife
- 1656★ `Stonewuu/ai-fusion-video` (MIT, pushed 2026-10-24): 【融光】 - 基于 Agent 的全流程AI短剧/漫剧/视频创作平台 - Java & agentscope2.0 | Agent-based end-to-end AI creation platform for sh
- 1108★ `scenario-labs/skills` (MIT, pushed 2026-10-23): Get production-ready images, video, audio, and 3D from any AI agent: skills that pick the right model, price b
- 1064★ `zai-org/SCAIL` (Apache-2.0, pushed 2026-05-06): SCAIL: Towards Studio-Grade Character Animation via In-Context Learning of 3D-Consistent Pose Representations 
- 1014★ `worldbench/awesome-3d-4d-world-models` (Apache-2.0, pushed 2026-10-21): [TPAMI 2026] 3D and 4D World Modeling: A Survey
- 1013★ `thu-ml/Causal-Forcing` (Apache-2.0, pushed 2026-10-24): [ICML 2026] Official codebase for "Causal Forcing: Autoregressive Diffusion Distillation Done Right for High-Q
- 782★ `OSideMedia/higgsfield-ai-prompt-skill` (MIT, pushed 2026-10-23): Claude AI skill for cinematic Higgsfield AI prompts — 32 sub-skills covering Seedance 2.5 (omni-reference, vid
- 746★ `myccarl/ai-shortVideo-pipeline` (MIT, pushed 2026-09-02): End-to-end AI short-video production pipeline. FastAPI orchestration + Spring Boot gateway with multi-model fa

### other / research
- 3973★ `thu-ml/SageAttention` (Apache-2.0, pushed 2026-01-17): [ICLR2025, ICML2025, NeurIPS2025 Spotlight] Quantized Attention achieves speedup of 2-5x compared to FlashAtte
- 2750★ `SkyworkAI/Matrix-Game` (MIT, pushed 2026-10-19): Matrix-Game 4.0: Streaming Neural Rendering for Playable Games
- 1440★ `ant-research/4DAnyone` (Apache-2.0, pushed 2026-10-14): [SIGGRAPH Asia 2026] 4DAnyone: Create Anyone in 4D from a Casual Monocular Video
- 1386★ `nvidia-cosmos/cosmos-predict2.5` (Apache-2.0, pushed 2026-06-08): Cosmos-Predict2.5, the latest version of the Cosmos World Foundation Models (WFMs) family, specialized for sim
- 1262★ `thu-ml/SpargeAttn` (Apache-2.0, pushed 2026-02-25): [ICML2025] SpargeAttention: A training-free sparse attention that accelerates any model inference.
- 460★ `bytedance/Video-As-Prompt` (Apache-2.0, pushed 2026-02-08): [ICLR 2026] Official repo for paper "Video-As-Prompt: Unified Semantic Control for Video Generation"
- 415★ `ShuangLI59/unified_video_action` (MIT, pushed 2026-08-21): Official PyTorch Implementation of Unified Video Action Model (RSS 2025)
- 400★ `AceDataCloud/Nexior` (MIT, pushed 2026-10-22): Consumer AI app for chat, image generation, video generation, and music creation powered by Ace Data Cloud API
- 337★ `VAST-AI-Research/EdenLive` (Apache-2.0, pushed 2026-10-21): Real-time generative rendering for interactive worlds, from any visual reference.
- 335★ `SandAI-org/MagiCompiler` (Apache-2.0, pushed 2026-10-24): A plug-and-play compiler that delivers free-lunch optimizations for both inference and training.
- 319★ `THU-SI/Video-T1` (MIT, pushed 2026-03-07): [ICCV 2025] Video-T1: Test-Time Scaling for Video Generation
- 211★ `aHapBean/VideoREPA` (Apache-2.0, pushed 2026-03-06): [NeurIPS 2025] VideoREPA: Learning Physics for Video Generation through Relational Alignment with Foundation M

### talking-head / lip-sync / avatar
- 13877★ `krillinai/OpenCreator` (Apache-2.0, pushed 2026-10-24): Formerly KrillinAI, VideoTranslation and Dubbing Tool. Open-source AI workspace for creators, powered by Codex
- 4664★ `antgroup/echomimic_v2` (Apache-2.0, pushed 2026-02-23): [CVPR 2025] EchoMimicV2: Towards Striking, Simplified, and Semi-Body Human Animation
- 4032★ `GVCLab/PersonaLive` (Apache-2.0, pushed 2026-08-28): [CVPR 2026] PersonaLive! : Expressive Portrait Image Animation for Live Streaming
- 1271★ `Francis-Rings/StableAvatar` (MIT, pushed 2026-09-25): [NeurIPS2026] We present StableAvatar, the first end-to-end video diffusion transformer, which synthesizes inf
- 1094★ `antgroup/echomimic_v3` (Apache-2.0, pushed 2026-03-18): [AAAI 2026] EchoMimicV3: 1.3B Parameters are All You Need for Unified Multi-Modal and Multi-Task Human Animati
- 534★ `Carasibana/ComfyUI-H3-FaceRefine` (MIT, pushed 2026-09-13): Refine and improve the quality of small faces in MiniMax H3 video. Per-frame face tracking, crop, refine with 
- 500★ `SamurAIGPT/Seedance-2.5-API` (MIT, pushed 2026-10-06): Python wrapper for ByteDance's Seedance 2.5 API — Text-to-Video, Image-to-Video, realistic human faces, native
- 428★ `rediumvex/ai-video-generator-claude` (MIT, pushed 2026-08-11): 10 Claude skills that generate studio-quality AI video prompts for Seedance 2.0 on Higgsfield. Viral hooks, Sa
- 360★ `Anil-matcha/Seedance-2-API` (MIT, pushed 2026-10-06): Python wrapper for ByteDance's Seedance 2.0 , Seedance 2.5 and Seedance 2 Mini API — Text-to-Video, Image-to-V
- 342★ `vargHQ/sdk` (Apache-2.0, pushed 2026-10-22): AI video generation SDK — JSX for videos. One API for Kling, Flux, ElevenLabs, Veed. Built on Vercel AI SDK.
- 315★ `AkshitIreddy/AI-Powered-Video-Tutorial-Generator` (MIT, pushed 2026-09-21): Create and edit AI video tutorials with illustrated lessons, expressive presenters, distinct voices, and a nat
- 210★ `lucidrains/recurrent-interface-network-pytorch` (MIT, pushed 2026-06-11): Implementation of Recurrent Interface Network (RIN), for highly efficient generation of images and video witho

### code-based video (Remotion etc.)
- 18182★ `latent-spaces/brag` (MIT, pushed 2026-10-23): You built it. Now brag. Turn the project you just created into a short, shareable launch video with one comman
- 4744★ `nexu-io/html-video` (Apache-2.0, pushed 2026-06-21): Programmatic video for coding agents — HTML to video on your laptop. Turn HTML, CSS & data into real MP4s with
- 256★ `BeatAPI/BeatDesign` (Apache-2.0, pushed 2026-10-21): Local-first AI canvas and timeline. Any MCP agent. Open-source alternative to Higgsfield.
- 191★ `OneMoh/html-explainer` (MIT, pushed 2026-10-14): 把一个主题做成有配音、字幕、封面的讲解分析类视频 —— 全本地、用 HTML 写画面，稳定音画同步。 面向 AI 编程智能体的确定性 HTML → MP4 渲染流水线。
- 141★ `alecs5am/ralphy` (Apache-2.0, pushed 2026-09-22): Open-source desktop app for content creation, with an agent runtime and standalone CLI.
- 87★ `mutonby/vibetube` (MIT, pushed 2026-09-15): Desktop multicam recorder for macOS: records your screen and webcam in sync, then Claude Code or Codex edits t

### tools / UI / comfy / editing
- 212★ `SkyNotSilent/awesome-MiniMax-H3-cases` (MIT, pushed 2026-10-21): 2801 playable MiniMax H3 / Hailuo H3 cases, 731 complete public Prompts, and 25 source-checked tutorials. Bili
- 155★ `iChristGit/OpenWebui-Tools` (MIT, pushed 2026-10-23): Custom tools to enhance your Open-Webui Experience! 🚀
- 103★ `Rimcat-JA/blockvideo` (MIT, pushed 2026-10-21): 日本語の台本を貼るだけでスライド・VOICEVOX音声・焼き込み字幕入りのMP4を出力するローカルWebアプリ
