import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const palettes: Record<string, [string, string, string]> = {
  BREAKING: ["10130e", "e5f403", "ff5f56"],
  FUNNY: ["17131f", "e5f403", "c084fc"],
  DRAMATIC: ["0d101b", "ff5f56", "e5f403"],
  RECEIPTS: ["151611", "f5d76e", "a3e635"],
  DEBATE: ["10141d", "60a5fa", "e5f403"],
  STORY: ["141217", "f0abfc", "e5f403"],
};

function wrap(text: string, width: number, limit: number): string {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, limit).join("\n");
}

export async function renderClip(input: {
  output: string;
  thumbnail: string;
  duration: number;
  style: string;
  title: string;
  content: string;
  creator: string;
  target: string;
  cta: string;
  position: string;
  background: string;
}): Promise<void> {
  const dir = dirname(input.output);
  await mkdir(dir, { recursive: true });
  const files = {
    title: `${dir}/title.txt`,
    content: `${dir}/content.txt`,
    source: `${dir}/source.txt`,
    cta: `${dir}/cta.txt`,
  };
  await Promise.all([
    writeFile(files.title, wrap(input.title, 24, 4)),
    writeFile(files.content, wrap(input.content, 34, 8)),
    writeFile(files.source, `BLAST BY @${input.creator}\nTARGET: ${input.target}`),
    writeFile(files.cta, wrap(input.cta, 28, 3)),
  ]);
  const [base, accent, secondary] = palettes[input.style] ?? palettes.BREAKING;
  const bg = input.background === "midnight" ? "070a12" : base;
  const y = input.position === "top" ? 440 : input.position === "bottom" ? 1240 : 830;
  const text = (file: string, size: number, color: string, x: number, top: number) =>
    `drawtext=font='DejaVu Sans':textfile='${file}':fontcolor=0x${color}:fontsize=${size}:line_spacing=16:x=${x}:y=${top}`;
  const filter = [
    `drawbox=x=38:y=38:w=1004:h=1844:color=0x${accent}@0.15:t=3`,
    `drawbox=x=60:y=250:w=960:h=2:color=0x${accent}@0.8:t=fill`,
    `drawtext=font='DejaVu Sans':text='BLASTR CLIPS':fontcolor=0x${accent}:fontsize=48:x=70:y=100`,
    `drawtext=font='DejaVu Sans':text='${input.style}':fontcolor=0x${secondary}:fontsize=28:x=72:y=170`,
    text(files.title, 64, "ffffff", 70, 300),
    `drawbox=x=62:y=${y}:w=956:h=520:color=black@0.4:t=fill`,
    text(files.content, 42, "ffffff", 92, y + 70),
    text(files.source, 28, accent, 70, 1510),
    text(files.cta, 42, "ffffff", 70, 1660),
    `drawtext=font='DejaVu Sans':text='BLASTERR / SAY IT. BLAST IT.':fontcolor=0x${accent}:fontsize=26:x=70:y=1810`,
  ].join(",");
  await run("ffmpeg", [
    "-y", "-f", "lavfi", "-i", `color=c=0x${bg}:s=1080x1920:r=30`,
    "-t", String(input.duration), "-vf", filter, "-c:v", "libx264",
    "-preset", "veryfast", "-crf", "25", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", input.output,
  ], { maxBuffer: 4 * 1024 * 1024 });
  await run("ffmpeg", [
    "-y", "-ss", "1", "-i", input.output, "-frames:v", "1",
    "-vf", "scale=540:960", "-q:v", "4", input.thumbnail,
  ], { maxBuffer: 2 * 1024 * 1024 });
}