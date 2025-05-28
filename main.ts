import { Plugin, PluginSettingTab, Setting, App } from "obsidian";
import { execFile } from "child_process";
import * as Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-r";

declare global {
  interface Window {
    Prism: any;
  }
}

interface PythonRunnerSettings {
  pythonPath: string;
  rPath: string;
}

const DEFAULT_SETTINGS: PythonRunnerSettings = {
  pythonPath: "python",
  rPath: "Rscript"
};

//prevent treeshaking of Prism
void Prism.highlightElement;

function createTerminalOutput(el: HTMLElement, cls: string) {
  const outputEl = el.createDiv({ cls });
  outputEl.style.background = "#222";
  outputEl.style.color = "#b5e853";
  outputEl.style.fontFamily = "monospace";
  outputEl.style.padding = "12px";
  outputEl.style.marginTop = "10px";
  outputEl.style.borderRadius = "6px";
  outputEl.style.whiteSpace = "pre-wrap";
  outputEl.style.position = "relative";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.title = "Delete output";
  deleteBtn.style.position = "absolute";
  deleteBtn.style.top = "6px";
  deleteBtn.style.right = "8px";
  deleteBtn.style.background = "#444";
  deleteBtn.style.color = "#fff";
  deleteBtn.style.border = "none";
  deleteBtn.style.borderRadius = "3px";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.fontSize = "14px";
  deleteBtn.style.padding = "2px 6px";
  deleteBtn.onclick = () => outputEl.remove();
  outputEl.appendChild(deleteBtn);
  return { outputEl, deleteBtn };
}

function isDarkMode() {
  return document.body.classList.contains('theme-dark') || document.body.classList.contains('dark');
}

function handlePythonRun(source: string, el: HTMLElement, pythonPath: string) {
  el.querySelectorAll('.python-output').forEach(e => e.remove());
  const { outputEl, deleteBtn } = createTerminalOutput(el, "python-output terminal-output");
  outputEl.setText("Running...");
  outputEl.appendChild(deleteBtn);
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const tmpDir = os.tmpdir();
  const plotFile = path.join(tmpDir, `obsidian_pyplot_${Date.now()}_${Math.floor(Math.random()*10000)}.png`);
  let wrappedPy = source;
  if (/import\s+matplotlib|from\s+matplotlib|import\s+pyplot|from\s+matplotlib\.pyplot/i.test(source)) {
    wrappedPy = `import warnings\nwarnings.filterwarnings('ignore')\nimport matplotlib; matplotlib.use('Agg')\n` + wrappedPy;
    if (!/savefig\s*\(/.test(source)) {
      wrappedPy += `\nimport matplotlib.pyplot as _plt_autogen\n_plt_autogen.savefig(r'${plotFile.replace(/\\/g, "/")}')\n_plt_autogen.close('all')`;
    }
  }
  execFile(
    pythonPath,
    ["-c", wrappedPy],
    (error, stdout, stderr) => {
      let imgTag = '';
      if (fs.existsSync(plotFile)) {
        try {
          const imgData = fs.readFileSync(plotFile);
          const base64 = imgData.toString('base64');
          const dark = isDarkMode();
          imgTag = `<img src="data:image/png;base64,${base64}" style="max-width:100%;border-radius:6px;margin-top:10px;${dark ? 'filter:invert(1) hue-rotate(180deg);' : ''}"/>`;
        } catch (e) {
          imgTag = '<span style="color:red">Failed to read plot image.</span>';
        }
        fs.unlinkSync(plotFile);
      }
      outputEl.innerHTML = `${imgTag}${stdout ? `<pre>${stdout}</pre>` : ''}${stderr ? `<pre style='color:red'>${stderr}</pre>` : ''}`;
      outputEl.appendChild(deleteBtn);
    }
  );
}

function handleRRun(source: string, el: HTMLElement, rPath: string) {
  el.querySelectorAll('.r-output').forEach(e => e.remove());
  const { outputEl, deleteBtn } = createTerminalOutput(el, "r-output terminal-output");
  outputEl.setText("Running...");
  outputEl.appendChild(deleteBtn);
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const tmpDir = os.tmpdir();
  const plotFiles: string[] = [];
  let plotCount = 0;
  const deviceRegex = /(^|\s)(png|svg|jpeg|tiff|bmp|pdf)\s*\(/i;
  let wrappedR = '';
  if (deviceRegex.test(source)) {
    wrappedR = `tryCatch({\n${source}\n}, error=function(e) print(e))`;
  } else {
    let code = source;
    const plotCallRegex = /(^|\s)plot\s*\(/g;
    let match;
    let lastIndex = 0;
    let newCode = '';
    while ((match = plotCallRegex.exec(code)) !== null) {
      const before = code.slice(lastIndex, match.index + match[0].length - 5);
      newCode += before;
      const plotFile = path.join(tmpDir, `obsidian_rplot_${Date.now()}_${Math.floor(Math.random()*10000)}_${plotCount}.png`);
      plotFiles.push(plotFile);
      newCode += `dev.off(); png('${plotFile.replace(/\\/g, "/")}', width=800, height=600); plot(`;
      lastIndex = match.index + match[0].length;
      plotCount++;
    }
    newCode += code.slice(lastIndex);
    wrappedR = `png('${plotFiles[0] ? plotFiles[0].replace(/\\/g, "/") : path.join(tmpDir, `obsidian_rplot_${Date.now()}_${Math.floor(Math.random()*10000)}_0.png`).replace(/\\/g, "/")}', width=800, height=600)\ntryCatch({\n${newCode}\n}, error=function(e) print(e))\ndev.off()`;
  }
  const scriptFile = path.join(tmpDir, `obsidian_rscript_${Date.now()}_${Math.floor(Math.random()*10000)}.R`);
  fs.writeFileSync(scriptFile, wrappedR);
  execFile(
    rPath,
    [scriptFile],
    (error, stdout, stderr) => {
      if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile);
      let imgTags = '';
      for (const plotFile of plotFiles) {
        if (fs.existsSync(plotFile)) {
          try {
            const imgData = fs.readFileSync(plotFile);
            const base64 = imgData.toString('base64');
            const dark = isDarkMode();
            imgTags += `<img src="data:image/png;base64,${base64}" style="max-width:100%;border-radius:6px;margin-top:10px;${dark ? 'filter:invert(1) hue-rotate(180deg);' : ''}"/>`;
          } catch (e) {
            imgTags += '<span style="color:red">Failed to read plot image.</span>';
          }
          fs.unlinkSync(plotFile);
        }
      }
      let cleanStdout = stdout ? stdout.replace(/null device\s*\d*\s*/gi, '').trim() : '';
      outputEl.innerHTML = `${imgTags}${cleanStdout ? `<pre>${cleanStdout}</pre>` : ''}${stderr ? `<pre style='color:red'>${stderr}</pre>` : ''}`;
      outputEl.appendChild(deleteBtn);
    }
  );
}

export default class PythonRunnerPlugin extends Plugin {
  settings: PythonRunnerSettings;
  async onload() {
    await this.loadSettings();
    this.registerMarkdownCodeBlockProcessor("xpython", async (source, el, ctx) => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      pre.appendChild(code);
      code.className = "language-python";
      code.textContent = source;
      el.appendChild(pre);
      if (window.Prism) window.Prism.highlightElement(code);
      const button = el.createEl("button", { text: "Run" });
      button.style.marginTop = "15px";
      el.appendChild(button);
      button.onclick = () => handlePythonRun(source, el, this.settings.pythonPath);
    });
    this.registerMarkdownCodeBlockProcessor("xr", async (source, el, ctx) => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      pre.appendChild(code);
      code.className = "language-r";
      code.textContent = source;
      el.appendChild(pre);
      if (window.Prism) window.Prism.highlightElement(code);
      const button = el.createEl("button", { text: "Run" });
      button.style.marginTop = "15px";
      el.appendChild(button);
      button.onclick = () => handleRRun(source, el, this.settings.rPath);
    });
    this.addSettingTab(new PythonRunnerSettingTab(this.app, this));
  }
  onunload() {}
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PythonRunnerSettingTab extends PluginSettingTab {
  plugin: PythonRunnerPlugin;
  constructor(app: App, plugin: PythonRunnerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Python Runner Settings" });
    new Setting(containerEl)
      .setName("Python Path")
      .setDesc("Path to the Python interpreter (e.g., from conda env)")
      .addText(text =>
        text
          .setPlaceholder("python")
          .setValue(this.plugin.settings.pythonPath)
          .onChange(async (value) => {
            this.plugin.settings.pythonPath = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("R Path")
      .setDesc("Path to the Rscript interpreter (e.g., from conda env)")
      .addText(text =>
        text
          .setPlaceholder("Rscript")
          .setValue(this.plugin.settings.rPath)
          .onChange(async (value) => {
            this.plugin.settings.rPath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
