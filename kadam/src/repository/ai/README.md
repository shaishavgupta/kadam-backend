# AI Repository Refactoring

This document describes the refactored AI repository structure that has been split into multiple, more maintainable modules.

## New Structure

The original monolithic `ai.repository.ts` file (851 lines) has been refactored into a modular structure:

```
src/repository/ai/
├── index.ts                    # Main orchestrator file
├── schemas/                     # Zod schemas
│   ├── index.ts
│   ├── course-search.ts
│   ├── user-profile.ts
│   └── chat-response.ts
├── persona-detector.ts         # User persona and dialect detection
├── prompt-generator.ts         # System prompts and persona-specific prompts
├── conversation-flow.ts        # Conversation stage management
├── response-generator.ts       # Response generation for different types
└── session-manager.ts          # Session handling and user profile management
```

## Module Descriptions

### 1. Schemas (`schemas/`)
- **Purpose**: Centralized Zod schema definitions
- **Files**:
  - `course-search.ts`: Course search input/output schemas
  - `user-profile.ts`: User profile and persona detection schemas
  - `chat-response.ts`: Chat response and response interface schemas
  - `index.ts`: Re-exports all schemas

### 2. Persona Detector (`persona-detector.ts`)
- **Purpose**: Handles user persona and dialect detection using LLM
- **Key Features**:
  - Caching mechanism for detection results
  - Fallback handling for detection failures
  - Cache management utilities

### 3. Prompt Generator (`prompt-generator.ts`)
- **Purpose**: Generates system prompts based on persona and dialect
- **Key Features**:
  - Dialect-specific instructions
  - Persona-specific prompts (student, jobbie, dylan, content_creator)
  - Configurable prompt building

### 4. Conversation Flow (`conversation-flow.ts`)
- **Purpose**: Manages conversation stages and flow logic
- **Key Features**:
  - Stage determination logic
  - Profile completion checking
  - Missing field identification

### 5. Response Generator (`response-generator.ts`)
- **Purpose**: Generates responses for different conversation stages
- **Key Features**:
  - Stage-specific response generation
  - User perspective metadata generation
  - Fallback responses for each stage

### 6. Session Manager (`session-manager.ts`)
- **Purpose**: Handles session management and user profile storage
- **Key Features**:
  - Session creation and loading
  - User profile management
  - Message history management
  - Session statistics and utilities

### 7. Main Index (`index.ts`)
- **Purpose**: Orchestrates all modules and provides the main chat flow
- **Key Features**:
  - Initializes all managers
  - Defines the main chat flow
  - Handles error responses
  - Exports all necessary functions

## Benefits of Refactoring

1. **Maintainability**: Each module has a single responsibility
2. **Readability**: Smaller, focused files are easier to understand
3. **Testability**: Individual modules can be tested in isolation
4. **Reusability**: Modules can be imported and used independently
5. **Scalability**: Easy to add new features or modify existing ones
6. **Code Organization**: Related functionality is grouped together

## Backward Compatibility

The original `ai.repository.ts` file now simply re-exports everything from the new modular structure, ensuring backward compatibility with existing imports.

## Usage

The refactored code maintains the same public API:

```typescript
import { chatFlow, flows, userProfileManager, sessionManagerExports } from './repository/ai.repository';
```

All existing functionality remains unchanged, but the code is now much more organized and maintainable.
