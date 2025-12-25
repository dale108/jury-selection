# Git Repository Setup

## Initialize Git Repository

```bash
# Initialize git repository
git init

# Add all files (respects .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Voir-dire microservices backend"

# Optional: Add remote repository
git remote add origin <your-repo-url>

# Push to remote
git push -u origin main
```

## Common Git Commands

```bash
# Check status
git status

# Add specific files
git add <file>

# Commit changes
git commit -m "Your commit message"

# View commit history
git log

# Create a new branch
git checkout -b feature/your-feature-name

# Switch branches
git checkout main

# Merge branch
git merge feature/your-feature-name

# View differences
git diff
```

## Recommended Git Workflow

1. **Create feature branch:**
   ```bash
   git checkout -b feature/add-frontend
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add React frontend"
   ```

3. **Push to remote:**
   ```bash
   git push origin feature/add-frontend
   ```

4. **Create pull request** (on GitHub/GitLab/etc.)

5. **Merge to main** after review

## Ignored Files

The `.gitignore` file excludes:
- Python cache files (`__pycache__/`, `*.pyc`)
- Virtual environments (`venv/`, `.venv/`)
- Environment variables (`.env`)
- Node modules (if frontend added)
- Docker logs
- Audio test files
- IDE configuration files
- OS-specific files (`.DS_Store`, `Thumbs.db`)

## Important: Environment Variables

**Never commit `.env` files!** They contain sensitive information like API keys.

Create a `.env.example` file with placeholder values for others to reference:

```bash
# .env.example
OPENAI_API_KEY=your_openai_api_key_here
HF_AUTH_TOKEN=your_huggingface_token_here
POSTGRES_PASSWORD=your_password_here
```

