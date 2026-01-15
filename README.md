# Cognitive Testing Platform

A React-based web application for administering a battery of cognitive assessment tasks. Built with Vite for fast development and optimized performance.

## 🧠 Cognitive Tasks

The platform includes the following cognitive assessment tasks, administered in sequence:

### 1. Go/No-Go Test
**Measures:** Inhibitory control and response inhibition

- Press spacebar when you see an **orange square** (Go)
- Do NOT press when you see a **blue square** (No-Go)
- Tests ability to inhibit automatic responses

### 2. Mental Arithmetic Task (MAT)
**Measures:** Working memory and cognitive stress response

- Solve arithmetic problems (addition, subtraction, multiplication)
- Choose the correct answer from two options using arrow keys
- Includes training and main test phases

### 3. Psychomotor Vigilance Task (PVT)
**Measures:** Sustained attention and reaction time

- Wait for a visual stimulus to appear
- Press spacebar as quickly as possible when it appears
- Measures alertness and sustained attention

### 4. Stroop Test (Interference Only)
**Measures:** Cognitive interference and selective attention

- See color words printed in mismatched ink colors
- Press the key corresponding to the **INK COLOR** (not the word)
- Keys: R (Red), Y (Yellow), G (Green), B (Blue)
- Single interference block with 12 trials

### 5. N-Back Task
**Measures:** Working memory capacity

- **1-Back:** Press spacebar if current letter matches the previous letter
- **2-Back:** Press spacebar if current letter matches 2 letters back
- 30 trials per block, 2 blocks total

### 6. Trail Making Task
**Measures:** Visual attention and task switching

- **Part A:** Connect numbers in order (1-2-3-4...)
- **Part B:** Alternate between numbers and letters (1-A-2-B-3-C...)
- Tests cognitive flexibility and processing speed

### 7. Posner Cueing Task
**Measures:** Spatial attention and attention orienting

- Keep eyes on central fixation cross
- Respond to target (★) appearing in left or right box
- Press Left/Right arrow keys to indicate target location
- Single block with 30 trials

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📊 Data Collection

- All task responses and reaction times are recorded
- Results are compiled and downloaded as JSON at session end
- Optional camera recording for quality assurance (with consent)

## 🛠️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **CSS** - Styling (fullscreen optimized layouts)

## 📁 Project Structure

```
src/
├── components/
│   ├── Flanker Task/        # (Currently disabled)
│   ├── Go-NoGo Task/        # Inhibitory control
│   ├── Mental Arithmetic Task/
│   ├── N-back task/         # Working memory
│   ├── Posner cueing Task/  # Spatial attention
│   ├── Psychomotor Vigilance Task/
│   ├── Stroop test/         # Cognitive interference
│   ├── Trail making task/   # Visual attention
│   └── RegistrationForm.jsx
├── context/
│   └── TaskDataContext.jsx  # Centralized data management
├── utils/
│   └── taskDataFormatter.js # Data formatting utilities
├── App.jsx                  # Main app with task sequencing
└── main.jsx
```
