require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.log("❌ OPENROUTER_API_KEY is missing. Check .env");
}

function extractFirstJSONObject(text) {
  if (!text) return null;

  // 1) 코드블록 제거
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 2) 첫 '{'부터 마지막 '}'까지 잘라보기
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const candidate = t.slice(first, last + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function callOpenRouter({ system, user, model = "google/gemma-2-9b-it" }) {
  console.log("AI REQUEST START");

  const payload = {
    model,
    // OpenRouter 표준: messages
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ],
    // 응답을 JSON으로 유도 (지원되는 경우에만 효과)
    response_format: { type: "json_object" },
    temperature: 0.2,
  };

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    payload,
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter 권장 헤더 (없어도 되지만 있으면 안정)
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "prompt-engine",
      },
      timeout: 30000,
    }
  );

  console.log("AI RESPONSE RECEIVED");

  const text = res.data?.choices?.[0]?.message?.content || "";
  return text;
}

/** 공통: AI가 준 응답에서 JSON 객체를 뽑아내서 반환 */
async function runJsonTask({ system, user }) {
  const text = await callOpenRouter({ system, user });

  // 1차: 그대로 JSON.parse 시도
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // 2차: 텍스트 중 JSON 부분만 추출
    const obj = extractFirstJSONObject(text);
    if (obj) return obj;

    // 마지막: 디버깅용으로 일부 출력
    console.log("❌ JSON parse failed. Raw content preview:");
    console.log(text.slice(0, 400));

    throw new Error("AI returned non-JSON content");
  }
}

// analyze
app.post("/analyze", async (req, res) => {
  console.log("ANALYZE REQUEST RECEIVED");

  try {
    const { prompt } = req.body;

    const system = `You are an expert prompt evaluator.
You MUST return ONLY a valid JSON object.
No markdown, no code fences, no extra text.`;

    const user = `Return JSON:

{
  "goal_clarity": number,
  "context_depth": number,
  "constraint_definition": number,
  "output_specification": number,
  "ambiguity_risk": number,
  "total_score": number,
  "diagnosis": "short explanation"
}

Prompt:
${prompt}`;

    const resultObj = await runJsonTask({ system, user });

    res.json({ success: true, result: resultObj });
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).json({ success: false, error: "AI analyze error" });
  }
});

// optimize
app.post("/optimize", async (req, res) => {

  console.log("OPTIMIZE REQUEST RECEIVED");

  try {

    const { prompt } = req.body;

    const system = `You are an expert prompt engineer.
You MUST return ONLY a valid JSON object.
No markdown, no explanation.`;

    const user = `Improve the following prompt.

Return JSON:

{
 "improved_prompt":"string",
 "changes":["reason1","reason2","reason3"]
}

Prompt:
${prompt}`;

    const resultObj = await runJsonTask({ system, user });

    res.json({
      success: true,
      result: resultObj
    });

  } catch (err) {

    console.error(err?.message || err);

    res.status(500).json({
      success: false,
      error: "AI optimize error"
    });

  }

});

app.listen(3000, () => {
  console.log("🚀 Server running http://localhost:3000");
});