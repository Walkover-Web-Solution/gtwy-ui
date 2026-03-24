<div align="center">

<h1>GTWY Frontend</h1>

<p>
  <b>GTWY</b> web frontend built with <b>Next.js</b> — fast UI, clean structure, and dev-friendly tooling.
</p>

<p>
  <a href="https://github.com/Walkover-Web-Solution/gtwy-frontend">
    <img alt="Repo" src="https://img.shields.io/badge/repo-gtwy--frontend-000?style=for-the-badge">
  </a>
  <a href="https://github.com/Walkover-Web-Solution/gtwy-frontend/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-2ea44f?style=for-the-badge">
  </a>
  <a href="https://github.com/Walkover-Web-Solution/gtwy-frontend/actions">
    <img alt="CI" src="https://img.shields.io/badge/CI-GitHub_Actions-1f6feb?style=for-the-badge">
  </a>
</p>

<p>
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-env">Env</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-scripts">Scripts</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

<hr/>

<h2>✨ What this repo contains</h2>

<ul>
  <li>Production-ready <b>Next.js</b> app (App Router)</li>
  <li>Reusable UI components + predictable folder structure</li>
  <li>Code quality: <b>ESLint</b> + <b>Prettier</b></li>
  <li>Commit discipline: <b>Husky</b> + <b>Commitlint</b></li>
</ul>

<hr/>

<h2 id="-quick-start">🚀 Quick Start</h2>

<p><b>1) Clone</b></p>
<pre><code>git clone https://github.com/Walkover-Web-Solution/gtwy-frontend.git
cd gtwy-frontend</code></pre>

<p><b>2) Install</b></p>
<pre><code>npm install</code></pre>

<p><b>3) Configure env</b></p>

<blockquote>
  <p><b>Tip:</b> Copy <code>.env.example</code> to <code>.env.local</code>. Never commit <code>.env.local</code>.</p>
</blockquote>

<pre><code>cp .env.example .env.local</code></pre>

<p><b>4) Run</b></p>
<pre><code>npm run dev</code></pre>

<p>
  Open: <a href="http://localhost:3000"><code>http://localhost:3000</code></a>
</p>

<hr/>

<h2 id="-tech-stack">🧱 Tech Stack</h2>

<table>
  <tr>
    <td><b>Framework</b></td>
    <td>Next.js (App Router), React</td>
  </tr>
  <tr>
    <td><b>Styling</b></td>
    <td>Tailwind CSS, Daisy UI</td>
  </tr>
  <tr>
    <td><b>Quality</b></td>
    <td>ESLint, Prettier</td>
  </tr>
</table>

<hr/>

<h2 id="-project-structure">🗂️ Project Structure</h2>

<details open>
  <summary><b>Click to view</b></summary>
  <br/>

  <table>
    <tr><td><code>app/</code></td><td>Next.js routes/pages (App Router)</td></tr>
    <tr><td><code>components/</code></td><td>Reusable UI components</td></tr>
    <tr><td><code>store/</code></td><td>App state management</td></tr>
    <tr><td><code>hooks/</code></td><td>React hooks</td></tr>
    <tr><td><code>customHooks/</code></td><td>Custom hooks / app-specific hooks</td></tr>
    <tr><td><code>utils/</code></td><td>Utilities/helpers</td></tr>
    <tr><td><code>styles/</code></td><td>Global styles</td></tr>
    <tr><td><code>public/</code></td><td>Static assets</td></tr>
    <tr><td><code>wrapper/</code></td><td>Wrappers/layout helpers</td></tr>
  </table>
</details>

<hr/>

<h2 id="-env">🔐 Environment Variables</h2>

<p>
  Use <code>.env.local</code> for local development.
</p>

<blockquote>
  <p><b>Rule:</b> Keep secrets in env files. Don’t hardcode them. Don’t commit them.</p>
</blockquote>

<p><b>Example</b> (<code>.env.local</code>):</p>
<pre><code>NEXT_PUBLIC_PYTHON_SERVER_URL=
NEXT_PUBLIC_SERVER_URL=</code></pre>

<blockquote>
  <p><b>Note:</b> Any variable starting with <code>NEXT_PUBLIC_</code> is exposed to the browser. Use it only for non-secret values.</p>
</blockquote>

<hr/>

<h2 id="-documentation">📚 Documentation</h2>
<ul>
  <li>
    <b>Architecture:</b>
    <a href="https://github.com/Walkover-Web-Solution/gtwy-frontend/blob/main/docs/ARCHITECTURE.md">
      docs/ARCHITECTURE.md
    </a>
  </li>
  <li>
    <b>AI Instructions:</b>
    <a href="https://github.com/Walkover-Web-Solution/gtwy-frontend/blob/main/docs/AI_INSTRUCTIONS.md">
      docs/AI_INSTRUCTIONS.md
    </a>
  </li>
</ul>

<hr/>

<h2 id="-scripts">⚙️ Scripts</h2>

<table>
  <tr><td><code>npm run dev</code></td><td>Run development server</td></tr>
  <tr><td><code>npm run build</code></td><td>Create production build</td></tr>
  <tr><td><code>npm run start</code></td><td>Start production server</td></tr>
  <tr><td><code>npm run lint</code></td><td>Lint the project</td></tr>
</table>

<hr/>

<h2>🧪 Quality & Git Rules</h2>

<ul>
  <li><b>Husky</b> runs checks before commits/pushes</li>
  <li><b>Commitlint</b> enforces clean commit messages (example: <code>feat: add org members page</code>)</li>
</ul>

<hr/>

<h2 id="-contributing">🤝 Contributing</h2>

<ol>
  <li>Create a branch: <code>feat/your-change</code> or <code>fix/your-fix</code></li>
  <li>Keep commits small and meaningful</li>
  <li>Open a PR with:
    <ul>
      <li>what changed</li>
      <li>why it changed</li>
      <li>screenshots (for UI)</li>
    </ul>
  </li>
</ol>

<hr/>

<h2>📄 License</h2>

<p>Licensed under <b>Apache-2.0</b>.</p>

<div align="center">
  <sub>Built for speed, structure, and clean developer experience.</sub>
</div>
