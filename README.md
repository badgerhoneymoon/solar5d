
# CLONING THIS REPO

## 📁 1. Clone the Starter Template

cd ~/Python
git clone https://github.com/badgerhoneymoon/starter.git my-new-project
cd my-new-project



⸻

## 🧹 2. Remove Original Git History

rm -rf .git

This unlinks the project from the original repo.

⸻

## 🌱 3. Initialize a New Git Repo

git init
git add .
git commit -m "Initial commit from starter"

⸻

## 🌐 4. Create and Link a GitHub Repo
	1.	Go to: https://github.com/new
	2.	Create a new repository (don’t initialize with README)
	3.	Back in terminal:

git remote add origin https://github.com/YOUR_USERNAME/my-new-project.git
git branch -M main
git push -u origin main


## 🚀 5. Run the Dev Server

Install dependencies and start the server:

npm install
npm run dev

Go to http://localhost:3000 to view your project.

⸻

# NextJS installation (WHEN NOT GIT CLONING)
1. go to Terminal
2. cd Python
3. npx shadcn@latest init
4. name the project
4. default settings
5. cd to the project folder
6. cursor .

git init
git add .         
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/badgerhoneymoon/starter.git
git push -u origin main
