import { config } from "dotenv"
config({ path: ".env.local" })

import { PrismaClient } from "../src/generated"

const db = new PrismaClient()

const templates = [
  {
    name: "React + Vite",
    description: "A minimal React app powered by Vite with hot module replacement.",
    category: "Frontend",
    tags: ["react", "vite", "javascript"],
    files: {
      "package.json": JSON.stringify({
        name: "react-app",
        private: true,
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: { "@vitejs/plugin-react": "^4.0.0", vite: "^5.0.0" },
      }, null, 2),
      "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
      "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ plugins: [react()] })`,
      "src/main.jsx": `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './App.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)`,
      "src/App.jsx": `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      <h1>React + Vite</h1>
      <button onClick={() => setCount(c => c + 1)}>count is {count}</button>
    </div>
  )
}`,
      "src/App.css": `* { box-sizing: border-box; margin: 0; padding: 0 }
body { background: #0f0f0f; color: #ffffffde; min-height: 100vh; display: flex; justify-content: center; align-items: center }
button { padding: .5rem 1.5rem; border-radius: 8px; border: 1px solid #646cff; background: transparent; color: inherit; font-size: 1rem; cursor: pointer }
button:hover { background: #646cff22 }`,
    },
  },
  {
    name: "Vue + Vite",
    description: "A minimal Vue 3 app with the Composition API, powered by Vite.",
    category: "Frontend",
    tags: ["vue", "vite", "javascript"],
    files: {
      "package.json": JSON.stringify({
        name: "vue-app",
        private: true,
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { vue: "^3.3.0" },
        devDependencies: { "@vitejs/plugin-vue": "^4.0.0", vite: "^5.0.0" },
      }, null, 2),
      "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`,
      "vite.config.js": `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({ plugins: [vue()] })`,
      "src/main.js": `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,
      "src/App.vue": `<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div style="font-family:sans-serif;text-align:center;padding:2rem">
    <h1>Vue + Vite</h1>
    <button @click="count++">count is {{ count }}</button>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0 }
body { background: #0f0f0f; color: #ffffffde; min-height: 100vh; display: flex; justify-content: center; align-items: center }
button { padding: .5rem 1.5rem; border-radius: 8px; border: 1px solid #42b883; background: transparent; color: inherit; font-size: 1rem; cursor: pointer }
button:hover { background: #42b88322 }
</style>`,
    },
  },
  {
    name: "Express",
    description: "A minimal Node.js REST API server with Express.js.",
    category: "Backend",
    tags: ["express", "node", "javascript", "api"],
    files: {
      "package.json": JSON.stringify({
        name: "express-app",
        private: true,
        scripts: { start: "node index.js", dev: "node --watch index.js" },
        dependencies: { express: "^4.18.0" },
      }, null, 2),
      "index.js": `const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!' })
})

app.get('/api/items', (req, res) => {
  res.json([
    { id: 1, name: 'Item One' },
    { id: 2, name: 'Item Two' },
  ])
})

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`)
})`,
    },
  },
  {
    name: "Hono",
    description: "A fast, lightweight web framework for the Edge. TypeScript-first.",
    category: "Backend",
    tags: ["hono", "typescript", "edge", "api"],
    files: {
      "package.json": JSON.stringify({
        name: "hono-app",
        private: true,
        scripts: { dev: "tsx watch src/index.ts", start: "tsx src/index.ts" },
        dependencies: { hono: "^4.0.0" },
        devDependencies: { tsx: "^4.0.0", typescript: "^5.0.0" },
      }, null, 2),
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
        },
      }, null, 2),
      "src/index.ts": `import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello from Hono!' }))

app.get('/api/items', (c) =>
  c.json([
    { id: 1, name: 'Item One' },
    { id: 2, name: 'Item Two' },
  ])
)

export default app`,
    },
  },
  {
    name: "Next.js",
    description: "A full-stack React framework with App Router, server components, and API routes.",
    category: "Fullstack",
    tags: ["nextjs", "react", "typescript", "fullstack"],
    files: {
      "package.json": JSON.stringify({
        name: "nextjs-app",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { next: "^14.0.0", react: "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: { typescript: "^5.0.0", "@types/node": "^20.0.0", "@types/react": "^18.0.0" },
      }, null, 2),
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "es5",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          moduleResolution: "bundler",
          resolveJsonModule: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"],
      }, null, 2),
      "app/layout.tsx": `export const metadata = { title: 'Next.js App' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem' }}>{children}</body>
    </html>
  )
}`,
      "app/page.tsx": `export default function Page() {
  return (
    <main>
      <h1>Hello from Next.js</h1>
      <p>Edit <code>app/page.tsx</code> to get started.</p>
    </main>
  )
}`,
      "app/api/hello/route.ts": `import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ message: 'Hello from the API!' })
}`,
    },
  },
]

async function main() {
  console.log("Seeding templates…")

  for (const template of templates) {
    await db.template.upsert({
      where: { id: template.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: template,
      create: {
        id: template.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        ...template,
      },
    })
    console.log(`  ✓ ${template.name}`)
  }

  console.log("Done.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
