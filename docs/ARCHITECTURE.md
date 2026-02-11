## Project Overview
**GTWY-AI Frontend** is a Next.js application that serves as the user interface for an GTWY platform. It enables users to manage AI agents, configure models, handle integrations, and monitor metrics across multiple AI services.

### Tech Stack

- **Framework**: Next.js 15.5.2 (App Router)
- **UI Library**: React 19.1.1
- **State Management**: Redux Toolkit + Redux Persist
- **Styling**: Tailwind CSS + DaisyUI
- **HTTP Client**: Axios with custom interceptors
- **Charts**: ApexCharts (react-apexcharts)
- **Icons**: Lucide React
- **Real-time**: RTLayer Client
- **Analytics**: PostHog

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
├── config/                 # API configuration layer
├── customHooks/            # Custom React hooks
├── store/                  # Redux store, actions, and reducers
├── utils/                  # Utility functions and helpers
├── styles/                 # Global styles and CSS
├── public/                 # Static assets
└── wrapper/                # Redux provider wrapper
```

## Architecture Layers

### 1. Application Layer (`/app`)

Uses Next.js App Router with file-based routing:

```
app/
├── layout.js              # Root layout with metadata
├── page.js                # Landing page
├── org/                   # Organization-scoped routes
│   ├── [org_id]/          # Dynamic organization routes
│   │   ├── agents/        # Agent management
│   │   ├── metrics/       # Analytics dashboard
│   │   ├── apikeys/       # API key management
│   │   └── ...
├── embed/                 # Embedded widget interface
└── login/                 # Authentication pages
```

**Key Features:**
- Dynamic routing with organization scoping
- Protected routes with authentication
- Embed-specific layouts for widget integration
- Server-side rendering with Edge runtime

### 2. Component Layer (`/components`)

Organized by feature and reusability:

```
components/
├── [ComponentName].js     # Standalone components
├── configuration/         # Agent configuration UI
├── sliders/              # Sidebar navigation components
├── modals/               # Modal dialogs
├── historyPageComponents/ # Chat history interface
├── metrics/              # Analytics visualizations
├── organization/         # Organization management
└── UI/                   # Base UI components
```

### 3. State Management Layer (`/store`)

```
store/
├── store.js              # Store configuration with persistence
├── action/               # Redux actions
└── reducer/              # Redux reducers
```

**Key Reducers:**
- `bridgeReducer`: Agent/bridge management
- `userDetailsReducer`: User and organization data
- `chatReducer`: Chat interface state
- `apiKeysReducer`: API key management
- `variableReducer`: Dynamic variables

**State Persistence:**
- Uses Redux Persist with localStorage
- Selective persistence (whitelist approach)
- Handles SSR with no-op storage fallback

### 4. API Layer (`/config`)

Modular API configuration split by domain:

```
config/
├── index.js              # Re-exports all APIs
├── bridgeApi.js          # Agent/bridge operations
├── authApi.js            # Authentication
├── organizationApi.js    # Organization management
├── modelApi.js           # AI model configuration
├── chatbotApi.js         # Chatbot management
└── ...                   # Other domain APIs
```

**HTTP Configuration:**
- Axios with custom interceptors (`/utils/interceptor.js`)
- Automatic token management (local_token vs proxy_auth_token)
- Request/response transformation
- Error handling with automatic redirect

### 5. Custom Hooks Layer (`/customHooks`)

Reusable business logic and optimizations:

```
customHooks/
├── customSelector.js     # Optimized Redux selector with deep equality
├── useConfigurationState.js # Configuration page state
├── useMetricsData.js     # Metrics data processing
├── useThemeManager.js    # Theme switching logic
└── ...                   # Other domain hooks
```

**Key Hook: `useCustomSelector`**
- Wraps Redux `useSelector` with deep equality comparison
- Prevents unnecessary re-renders
- Used throughout the app instead of standard `useSelector`

### 6. Utility Layer (`/utils`)

Helper functions and configurations:

```
utils/
├── utility.js            # Core utility functions
├── interceptor.js        # Axios configuration
├── enums.js              # Application constants
├── posthog.js            # Analytics setup
└── ...                   # Other utilities
```

## Data Flow Architecture

Step-by-Step Process
1. **User Interaction**: Button click, form submission, page load
2. **Component Dispatch**: `dispatch(actionName())`
3. **Action Creator**: Located in `/store/action/`
4. **API Call**: Uses functions from `/config/`
5. **HTTP Request**: Axios with interceptors handles authentication
6. **Response Processing**: Data transformation and error handling
7. **Reducer Update**: State mutation in `/store/reducer/`
8. **Component Update**: `useCustomSelector` triggers re-render


## Key Architectural Patterns

### 1. Redux Pattern with Custom Selector
- Use `useCustomSelector()` instead of `useSelector()`
- Access state: `state.bridgeReducer.allBridges`, `state.bridgeReducer.loading`

### 2. API Action Pattern
- Functions: `fetchDataAction()`, `setLoading()`, `setData()`, `setError()`
- Pattern: try/catch with loading states

### 3. Component Composition Pattern
- Functions: `useConfigurationState()`, `ConfigurationProvider`
- Components: `ConfigurationHeader`, `ConfigurationBody`, `ConfigurationFooter`

### 4. Modal Management Pattern
- Functions: `openModal()`, `closeModal()` from `@/utils/utility`

## Routing Architecture

### Organization-Scoped Routes

All main application routes are scoped under `/org/[org_id]/`:

- `/org/[org_id]/agents` - Agent management
- `/org/[org_id]/metrics` - Analytics dashboard
- `/org/[org_id]/apikeys` - API key management
- `/org/[org_id]/knowledge_base` - Knowledge base
- `/org/[org_id]/integration` - Third-party integrations

### Special Routes

- `/embed` - Embedded widget interface
- `/login` - Authentication
- `/new` - New user onboarding
- `/chatbotPreview` - Chatbot preview interface

### Route Protection
- Component: `<Protected>` wrapper for authenticated routes

## Performance Optimizations

### 1. Component Splitting

Large components are split into smaller, focused components:
- Reduces bundle size
- Improves maintainability
- Enables better memoization

### 2. Dynamic Imports
- Function: `dynamic()` for lazy loading
- Components: `LoadingSkeleton` for loading states

### 4. Redux Persistence Optimization

Only essential state is persisted to localStorage using a whitelist approach.

## Development Guidelines

### Adding New Features

1. **Read Documentation**: Check existing patterns and architecture
2. **Explore Similar Features**: Find comparable implementations
3. **Follow Established Patterns**: Use existing hooks, components, and utilities
4. **Update Documentation**: Document new patterns or significant changes

### Component Creation Guidelines
- Import: `useCustomSelector` from `@/customHooks/customSelector`
- Import: Actions from `@/store/action/[actionName]`
- Pattern: Check loading states, handle errors
- Structure: Props → State → Handlers → Render

## Common Patterns and Conventions

### File Naming
- Components: PascalCase (`MyComponent.js`)
- Hooks: camelCase with 'use' prefix (`useMyHook.js`)
- Utilities: camelCase (`myUtility.js`)
- Constants: UPPER_SNAKE_CASE

### Import Organization
- External libraries first
- Internal imports: hooks, actions, components
- Use `@/` path aliases


This architecture guide provides the foundation for understanding and contributing to the GTWY Frontend project. Always refer to existing implementations when adding new features to maintain consistency and follow established patterns.
