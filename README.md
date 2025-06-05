# 🌌 Solar5D - Interactive 3D Solar System Explorer

> **Advanced 3D solar system visualization combining Three.js rendering, Cesium Earth integration, AI voice interaction, and gesture controls**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.176-orange?logo=three.js)](https://threejs.org/)
[![Cesium](https://img.shields.io/badge/Cesium-1.129-green?logo=cesium)](https://cesium.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?logo=openai)](https://openai.com/)

## 🚀 Live Demo

**[🌍 Explore the Solar System →](https://solar5d.vercel.app/)**

*3D solar system visualization with AI interaction and gesture controls.*

---

## 📖 Development Story

Read about the technical development process, challenges, and AI-assisted coding approach behind this project:

**[Vibe-Coding the Cosmos →](https://bip2.substack.com/p/vibe-coding-the-cosmos)**

*Detailed breakdown of Three.js implementation, MediaPipe gesture detection, OpenAI Realtime API integration, and the "vibe-coding" development methodology.*

---

## ✨ Features

### 🌌 **Core 3D Solar System & Earth Visualization**
- **Interactive Solar System:** 3D solar system with logarithmic radius scaling and linear distance scaling for visual clarity. Smooth orbital motion and rotation based on astronomical data from `solar-params.json`.
- **High-Quality Visuals:** 8K starfield skybox, 2K planetary textures (courtesy of [Solar System Scope](https://solarsystemscope.com/textures)), and shader-based post-processing effects including radial blur.
- **Cesium Earth Integration:** Transition from solar system view to detailed 3D Earth with global navigation, photorealistic imagery, height mapping, and multi-scale rendering.
- **Efficient WebGL Rendering:** Three.js with performance-optimized `MeshBasicMaterial` and efficient texture loading.

### 🕹️ **Interactive Controls & Navigation**
- **Object-Tracking Camera:** Smooth focus transitions between celestial bodies with `OrbitControls` for zoom, pan, and rotation.

<div align="center">
  <img src="public/screenshots/Cam_tracking.gif" alt="Camera Tracking Demo" width="600">
  <br><em>Click any planet to smoothly focus and track it</em>
</div>

- **Timeline & Animation Control:** Configurable time scales (up to 100,000x speed) and pause/resume controls using `lil-gui` interface.
- **Gesture Controls:** MediaPipe hand tracking for gesture detection with "Palm Pause" animation control.
- **Mobile Support:** Touch-friendly interface with responsive styling.

### 🧠 **AI & Educational Capabilities**
- **Voice Commands:** Natural language interaction through OpenAI integration. Ask questions and issue navigation commands using GPT models with function calling.
- **Astronomical Facts:** Displays facts for each celestial body from `solar-params.json` when focused.
- **Interactive Learning:** 3D visualization combined with AI-driven information retrieval.

---

## 🛠 Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   3D Engine     │    │   AI Services   │
│                 │    │                 │    │                 │
│ • Next.js 14    │◄──►│ • Three.js      │◄──►│ • OpenAI API    │
│ • TypeScript    │    │ • Cesium.js     │    │ • Realtime Voice│
│ • Tailwind CSS  │    │ • WebGL         │    │ • Tool Calling  │
│ • Radix UI      │    │ • Post Effects  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Input Systems │
                    │                 │
                    │ • MediaPipe     │
                    │ • Hand Tracking │
                    │ • Voice Input   │
                    │ • Touch/Mouse   │
                    └─────────────────┘
```

### Core Technologies
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js with WebGL, shader-based post-processing effects
- **Earth Visualization**: Cesium.js for photorealistic globe
- **AI Integration**: OpenAI GPT models with function calling
- **Gesture Recognition**: MediaPipe for hand tracking
- **UI Components**: Radix UI primitives with custom styling

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solar5d.git
cd solar5d

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your OpenAI API key and Cesium Ion access token to .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` to explore the solar system!

### Environment Setup

```env
# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_token_here
```

**Get your API keys:**
- **OpenAI API**: [Get your key here](https://platform.openai.com/api-keys)
- **Cesium Ion**: [Get your token here](https://ion.cesium.com/tokens)

---

## 🎮 How to Use

### Basic Navigation
1. **Mouse/Touch**: Drag to rotate view, scroll to zoom
2. **Planet Focus**: Click any planet to focus and get information
3. **Time Controls**: Use GUI to pause/speed up planetary motion

### Voice Interaction
1. **Enable Voice Mode**: Click the microphone button
2. **Ask Questions**: "Tell me about Mars" or "How far is Jupiter?"
3. **Navigation**: "Focus on Saturn" or "Show me Earth"

### Gesture Controls
1. **Enable Hand Tracking**: Toggle gesture controls
2. **Palm Pause**: Show palm to pause/resume animation

### Earth Exploration
1. **Transition to Earth**: Focus on Earth, then click "Explore Earth"
2. **Navigate Globe**: Use Cesium's built-in controls
3. **Search Locations**: Type any location to fly there instantly

---

## 📁 Project Structure

```
solar5d/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (OpenAI integration)
│   └── page.tsx           # Main application component
├── components/            # React components
│   ├── cesium/           # Cesium Earth integration
│   ├── gui/              # Control interfaces
│   └── ui/               # Reusable UI components
├── lib/                   # Core libraries
│   ├── three/            # Three.js scene setup & utilities
│   ├── services/         # API services (OpenAI, etc.)
│   └── utils/            # Helper functions
├── hooks/                 # Custom React hooks
├── info/                 # Solar system data & parameters
└── public/               # Static assets & textures
```

---

## 🛠 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Connect

Created by **Denis Burkatsky** - Building the future of interactive space exploration

[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?logo=linkedin)](https://www.linkedin.com/in/burkatskydan/)
[![X](https://img.shields.io/badge/-000000?logo=x&logoColor=white)](https://x.com/DBurkatsky)

---

*⭐ Star this repository if you found it interesting! ⭐*
