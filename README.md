# 🎵 8-Bit Composer

A retro-inspired music sequencer that lets you compose 8-bit style chiptunes on a grid-based interface. Includes AI-powered melody generation using AWS Bedrock and Claude.

---

## 🚀 Features

- ✅ Drag-and-click step sequencer grid
- 🎛️ Instrument selection, volume sliders, and mute buttons per row
- 🔉 Live playback using Web Audio API + Tone.js
- 🤖 AI-powered music generation via prompt using Claude on AWS Bedrock

---

## 📦 Prerequisites

To run this app, you need:

- Node.js (LTS recommended): https://nodejs.org/
- AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
- An AWS account with:
  - Bedrock access enabled
  - Claude model access approved (e.g. `anthropic.claude-v2`)
- Visual Studio Code with the **Live Server** extension installed:  
  https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer

---

## 🛠️ Setup & Running the Project

Follow these steps **exactly** to get everything working:

### 🔁 Step 1 – Clone the repository

```bash
git clone https://github.com/your-username/8bit-composer.git
cd 8bit-composer
```

### 🔐 Step 2 – Set up AWS CLI & credentials

You'll need to configure your AWS CLI to allow the backend to communicate with Bedrock.

```bash
aws configure
```

When prompted, enter:
* AWS Access Key ID
* AWS Secret Access Key
* Default region name: e.g. us-west-2
* Default output format: (leave blank or type json)

Make sure your IAM user or role has the necessary Bedrock permissions:
*  ```bedrock:InvokeModel```
* ```bedrock:InvokeModelWithResponseStream``` (optional)

🛑 You must request access to Claude via the [AWS Bedrock Console](https://us-west-2.console.aws.amazon.com/bedrock/home) before using the model.

### 🔧 Step 3 – Run the Node.js backend

The backend handles the `/generate` API call that sends your prompt to Claude on AWS Bedrock.

From the project root, navigate to the backend folder:

```bash
cd js/server
```

Then start the server: 
```bash
node server.js
```

If everything is working correctly, you’ll see output like:

```bash
▶ Using AWS_REGION = us-west-2
▶ Using MODEL_ID   = anthropic.claude-v2
🎶 Bedrock Runtime API listening on http://localhost:3000
```

### 🌐 Step 4 – Run the frontend with Live Server

The frontend is a static HTML/JS site that you can launch using the Live Server extension in VS Code.

1. Open the project folder in Visual Studio Code.
2. Open `index.html`.
3. Right-click on `index.html` and select **“Open with Live Server”**.
4. Your browser will open to: [http://127.0.0.1:5500/](http://127.0.0.1:5500/)

You should see the full grid interface, ready for composing.


### 🎼 Step 5 – Generate music using Claude

Once the frontend and backend are both running:

1. Type a music prompt into the input field at the top (e.g. `Make a mysterious dungeon theme`).
2. Click the **Generate** button.
3. The frontend sends your prompt to the backend (`localhost:3000/generate`), which forwards it to Claude via Bedrock.
4. The returned JSON composition is parsed and displayed in the grid.

> ⚠️ If you see an error in the console about the model or request being rejected, verify:
> - Your AWS credentials are valid
> - Claude access is approved
> - The model ID in `server.js` is correct (e.g. `anthropic.claude-v2`)

## ✍️ Prompt Writing Tips

The better your prompt, the better the melody! Try things like:

- `"Write an intense battle theme with pounding drums"`
- `"A spooky waltz for a haunted castle"`
- `"Something happy and bouncy, like Mario Kart"`

Claude generates musical structure and style descriptions—so be creative and descriptive! You can also tell it your preferred amount of steps and BPM.